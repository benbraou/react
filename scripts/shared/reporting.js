/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const {execSync} = require('child_process');
const chalk = require('chalk');

/**
 * Returns whether JUnit report generation mode is enabled. The activation is done through circleci
 * configuration file
 *
 * @returns {boolean} Whether JUnit report generation mode is enabled
 */
const isJUnitEnabled = () => process.env.REPORT_FORMATTER === 'junit';

/**
 * Returns the file path  to the report corresponding to the provided build step
 * @param {string} buildStep The build step for which a report will be generated
 * @returns {string} The file path  to the report corresponding to the provided build step
 */
const reportFilePath = buildStep =>
  `${process.env.REPORT_DIR}/${buildStep}-results.xml`;

/**
 * Creates directories (if missing corresponding) to a provided file path
 *
 * @param {string} filePath The file path
 */
const createDirectoriesIfMissing = filePath => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  createDirectoriesIfMissing(dirname);
  fs.mkdirSync(dirname);
};

/**
 * Builds the output that will be written in the XML JUnit report
 *
 * @param {string} data
 * @param {string} packageName
 * @param {boolean} hasPassed
 * @returns {string} The output that will be written in the JUnit report
 */
const buildXMLOutputAsSingleTest = (data, packageName, hasPassed) => {
  const nbrErrors = hasPassed ? 0 : 1;
  const detailedMessage = hasPassed
    ? ''
    : `
      <failure message=""><![CDATA[
${data}
      ]]>
      </failure>
  `;

  const testSuite = `
    <testsuite package="${packageName}" time="0" tests="1" errors="${
    nbrErrors
  }" name="${packageName.toUpperCase()}">
      <testcase time="0" name="${packageName} merged report">
${detailedMessage}
      </testcase>
    </testsuite>
  `;
  return `<?xml version="1.0"?>
  <testsuites>
    ${testSuite}
  </testsuites>
  `;
};

/**
 * Writes a JUnit report as a single test
 *
 * @param {ReportInfo}
 * @param {string} outputFile The file path describing the file that will hold the JUnit report
 */
const writeReportAsSingleTest = (data, packageName, hasPassed, outputFile) => {
  const xmlOutput = buildXMLOutputAsSingleTest(data, packageName, hasPassed);
  createDirectoriesIfMissing(outputFile);
  fs.writeFileSync(outputFile, xmlOutput, 'utf8');
};

/**
 * Writes a JUnit report for a given build step
 *
 * @param {string} buildStep The build step name
 * @param {any} data The data that will be part of the report if the build step has failed
 * @param {boolean} stepHasSucceeded Whether the build step has failed
 */
const writeJunitReport = (buildStep, data, stepHasSucceeded) => {
  const reportPath = reportFilePath(buildStep);
  console.log(chalk.gray(`Starting to write the report in ${reportPath}`));
  writeReportAsSingleTest(data, buildStep, stepHasSucceeded, reportPath);
  console.log(
    chalk.gray(
      `Finished writing the report in ${reportPath} for the build step ${
        buildStep
      }`
    )
  );
};

/**
 * Returns the name for the temporary JUnit report file name provided the base file name and a
 * unique index.
 *
 * @param {string} baseFileName The name of the JUnit report file into which all temporary files
 * will merged.
 * @param {number} index A number identifying the temporary JUnit report file
 * @returns {string} The name for the temporary JUnit report file name
 *
 */
function getPartialJUnitReportFileName(baseFileName, index) {
  if (!baseFileName.endsWith('.xml')) {
    throw Error('Invalid XML file name provided');
  }
  return baseFileName.replace('.xml', `${index}.xml`);
}

/**
 * Writes a partial JUnit report identified by an an index and output data
 *
 * @param {string} buildStep The build step name
 * @param {string} data The data that will be part of the report if the build step has failed
 * @param {number} index Number identifying the partial JUnit report
 * @param {Array.<string>} reportFileNames The list of report file names
 */
const writePartialJunitReport = (buildStep, data, index, reportFileNames) => {
  if (!isJUnitEnabled()) {
    return;
  }
  const fileName = getPartialJUnitReportFileName(
    reportFilePath(buildStep),
    index
  );
  console.log(
    chalk.gray(
      `Starting to write the partial report for ${buildStep} in ${fileName}`
    )
  );
  createDirectoriesIfMissing(fileName);
  fs.writeFileSync(fileName, data, 'utf8');
  console.log(
    chalk.gray(
      `Finished writing the partial report for ${buildStep} in ${fileName}`
    )
  );
  // Side effect whose goal is to keep track of partial JUnit reports. This list will be used at the
  // merge step into one single JUnit report
  reportFileNames.push(fileName);
};

/**
 * Merge all generated partial JUnit report files into a single one. The partial reports will then
 * be deleted
 *
 * @param {string} buildStep The build step name
 * @param {Array.<string>} reportFileNames The list of ESLint report file names
 */
const mergePartialJunitReports = (buildStep, reportFileNames) => {
  if (!isJUnitEnabled()) {
    return;
  }
  // Merge synchronously partial JUnit report files into a single one. This can be done
  // asynchronously as well
  try {
    execSync(
      `${path.join(
        'node_modules',
        'junit-merge',
        'bin',
        'junit-merge'
      )} ${reportFileNames.join(' ')} --out ${reportFilePath(buildStep)}`
    );
    console.log(
      `Created for the step ${
        buildStep
      } the JUnit merged report file ${reportFilePath(buildStep)}`
    );
  } catch (e) {
    throw new Error(
      `could not create for the step ${
        buildStep
      } the JUnit merged report file ${reportFilePath(buildStep)}`
    );
  }

  // Now, we delete the partial JUnit report files again synchronously
  reportFileNames.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`Deleted file: ${file}`);
    } catch (e) {
      // we don't want to throw an error as this is not blocking the build
      console.log(`Could not delete file: ${file}`);
    }
  });
};

module.exports = {
  isJUnitEnabled,
  reportFilePath,
  writeJunitReport,
  buildXMLOutputAsSingleTest,
  writePartialJunitReport,
  mergePartialJunitReports,
  getPartialJUnitReportFileName,
};
