/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/**
 * @typedef {Object} FormatterConfig
 * @property {String} name
 * @property {String} outputFile
 */

const fs = require('fs');
const minimatch = require('minimatch');
const CLIEngine = require('eslint').CLIEngine;
const listChangedFiles = require('../shared/listChangedFiles');
const {es5Paths, esNextPaths} = require('../shared/pathsByLanguageVersion');

const DEFAULT_FORMATTER_NAME = 'stylish';
const FORMATTER_FLAG = '--formatter=';
const OUTPUT_FLAG = '--output=';

const allPaths = ['**/*.js'];

let changedFiles = null;

/**
 * Returns the formatter configuration
 *
 * If a formatter name has been provided as a command line argument , it is returned. Otherwise,the
 * default formatter name `stylish` is returned.
 *
 * More information can be found in https://eslint.org/docs/developer-guide/nodejs-api#getformatter
 *
 * If an output file has been provided as a command line argument, it is returned
 *
 * @returns {FormatterConfig} the formatter configuration
 */
function getFormatterConfig() {
  let config = {
    name: DEFAULT_FORMATTER_NAME,
    outputFile: '',
  };
  const args = process.argv;
  for (let arg of args) {
    if (arg.startsWith(FORMATTER_FLAG)) {
      config.name = arg.replace(FORMATTER_FLAG, '');
    }
    if (arg.startsWith(OUTPUT_FLAG)) {
      config.outputFile = arg.replace(OUTPUT_FLAG, '');
    }
  }
  return config;
}

const formatterConfig = getFormatterConfig();

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

/**
 * Based on the formatter configuration, either log the output or write it to a file.
 *
 * Writing the output only to a file, means -in case of circle ci-, that eslint results will only
 * show up in the summary section and not the in the build output. (In case of lint failure, only
 * the message `Lint failed` will be available in the built output)
 *
 * Logging the output only, implies that the eslint result will be printed to console in the chosen
 * format. For example, if the formatter is `junit`, the console will log XML result that is
 * unfortunately not very readable.
 *
 * Future requirements can be implemented here, such as always logging the eslint result using the
 * `stylish` formatter and writing to a specified file the lint result using a different formatter
 * (ex: `junit`)
 *
 * @param {String} output Eslint output result
 */
function handleEslintOutput(output) {
  if (!formatterConfig.outputFile) {
    console.log(output);
  } else {
    console.log(`Writing lint results to: ${formatterConfig.outputFile}`);
    fs.writeFileSync(formatterConfig.outputFile, output, 'utf8');
  }
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
  ].forEach(result => {
    errorCount += result.errorCount;
    warningCount += result.warningCount;
    output += result.output;
  });
  handleEslintOutput(output);
  return errorCount === 0 && warningCount === 0;
}

module.exports = runESLint;
