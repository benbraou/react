/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const {exec} = require('child_process');

const minimatch = require('minimatch');
const CLIEngine = require('eslint').CLIEngine;
const listChangedFiles = require('../shared/listChangedFiles');
const {es5Paths, esNextPaths} = require('../shared/pathsByLanguageVersion');
const {
  getFormatterConfig,
  createDirectoriesIfMissing,
} = require('./eslint.utils');

const allPaths = ['**/*.js'];

let changedFiles = null;

const formatterConfig = getFormatterConfig();
const eslintTemporaryFiles = [];

function runESLintOnFilesWithOptions(filePatterns, onlyChanged, options) {
  const cli = new CLIEngine(options);

  // Retrieve the built-in formatter corresponding to the name provided in the configuration
  const formatter = cli.getFormatter(formatterConfig.name);
  if (!formatter) {
    throw new Error(`Could not find formatter ${formatterConfig.name}`);
  }

  if (onlyChanged && changedFiles === null) {
    // Calculate lazily.
    changedFiles = [...listChangedFiles()];
  }
  const finalFilePatterns = onlyChanged
    ? intersect(changedFiles, filePatterns)
    : filePatterns;
  const report = cli.executeOnFiles(finalFilePatterns);

  // When using `ignorePattern`, eslint will show `File ignored...` warnings for any ignores.
  // We don't care because we *expect* some passed files will be ignores if `ignorePattern` is used.
  const messages = report.results.filter(item => {
    if (!onlyChanged) {
      // Don't suppress the message on a full run.
      // We only expect it to happen for "only changed" runs.
      return true;
    }
    const ignoreMessage =
      'File ignored because of a matching ignore pattern. Use "--no-ignore" to override.';
    return !(item.messages[0] && item.messages[0].message === ignoreMessage);
  });

  const ignoredMessageCount = report.results.length - messages.length;
  return {
    output: formatter(messages),
    errorCount: report.errorCount,
    warningCount: report.warningCount - ignoredMessageCount,
  };
}

function intersect(files, patterns) {
  let intersection = [];
  patterns.forEach(pattern => {
    intersection = [
      ...intersection,
      ...minimatch.match(files, pattern, {matchBase: true}),
    ];
  });
  return [...new Set(intersection)];
}

function getFileNameWithIndex(fileName, index) {
  let splitted = fileName.split('.');
  splitted.splice(1, 0, index, '.');
  return splitted.join('');
}

/**
 * Based on the formatter configuration, log the output in console and write it to a file if
 * required.
 *
 * Writing the output only to a file, means -in case of circle ci-, that eslint results will show up
 * in the summary section. They will also be shown in the build output.
 *
 * Logging the output in console, implies that the eslint result will be printed to console in the
 * chosen format. For example, if the formatter is `junit`, the console will log XML result that is
 * unfortunately not very readable.
 *
 * Future requirements can be implemented here, such as always logging the eslint result using the
 * `stylish` formatter and writing to a specified file the lint result using a different formatter
 * (ex: `junit`)
 *
 * @param {String} output Eslint output result
 * @param {index} number unique number identifying the eslint run
 */
function handleEslintOutput(output, index) {
  if (!formatterConfig.outputFile) {
    return;
  }
  const fileName = getFileNameWithIndex(formatterConfig.outputFile, index);
  console.log(`Writing lint results to: ${fileName}`);
  createDirectoriesIfMissing(formatterConfig.outputFile);
  fs.writeFileSync(fileName, output, 'utf8');
  eslintTemporaryFiles.push(fileName);
}

/**
 *
 * @param {number} nbrOfRuns The number of ESLint runs that corresponds also to the number of
 * generated files
 */
function mergeOutputResults(nbrOfRuns) {
  // If we are not in the mode of outputting files, merging is not applicable.
  if (!formatterConfig.outputFile) {
    return;
  }

  exec(
    `junit-merge ${eslintTemporaryFiles.join(' ')} --out ${
      formatterConfig.outputFile
    } `,
    {cwd: __dirname},
    (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        process.exit(1);
      } else {
        console.log('remove temporary files');
      }
    }
  );

  Array(nbrOfRuns)
    .fill()
    .map((_, i) => `${formatterConfig.outputFile}${i}`);

  // fs.writeFileSync(formatterConfig.outputFile , merged, 'utf8');
}

function runESLint({onlyChanged}) {
  if (typeof onlyChanged !== 'boolean') {
    throw new Error('Pass options.onlyChanged as a boolean.');
  }

  let errorCount = 0;
  let warningCount = 0;
  let output = '';

  [
    runESLintOnFilesWithOptions(allPaths, onlyChanged, {
      configFile: `${__dirname}/eslintrc.default.js`,
      ignorePattern: [...es5Paths, ...esNextPaths],
    }),
    runESLintOnFilesWithOptions(esNextPaths, onlyChanged, {
      configFile: `${__dirname}/eslintrc.esnext.js`,
    }),
    runESLintOnFilesWithOptions(es5Paths, onlyChanged, {
      configFile: `${__dirname}/eslintrc.es5.js`,
    }),
  ].forEach((result, index) => {
    errorCount += result.errorCount;
    warningCount += result.warningCount;
    output += result.output;
    // we create a JUnit file per run and then we merge them into one using npm install junit-merge.
    // Otherwise, naively creating one file that contains the concatenated xml results will not be
    // parsed by circleci
    handleEslintOutput(result.output, index);
  });
  // Whether we store lint results in a file or not, we also log the results in the console
  console.log(output);
  return errorCount === 0 && warningCount === 0;
}

module.exports = runESLint;
