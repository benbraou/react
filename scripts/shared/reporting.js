/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

/**
 * Returns whether JUnit report generation mode is enabled. The activation is done through circleci
 * configuration file
 *
 * @returns {boolean} Whether JUnit report generation mode is enabled
 */
const isJunitEnabled = () => process.env.REPORT_FORMATTER === 'junit';

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
 * @param {String} outputFile The file path describing the file that will hold the JUnit report
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
      `Finished writing the report in ${reportPath} for the build step: ${
        buildStep
      }`
    )
  );
};

module.exports = {
  isJunitEnabled,
  reportFilePath,
  writeJunitReport,
  buildXMLOutputAsSingleTest,
};
