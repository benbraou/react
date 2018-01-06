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

const path = require('path');
const fs = require('fs');

const DEFAULT_FORMATTER_NAME = 'stylish';
const FORMATTER_FLAG = '--formatter=';
const OUTPUT_FLAG = '--output=';

/**
 * Returns based on the provided process arguments,the formatter configuration : the formatter name
 * and the output file.
 *
 * If a formatter name has been provided as a command line argument , it is returned. Otherwise,the
 * default formatter name `stylish` is returned.
 *
 * More information can be found in https://eslint.org/docs/developer-guide/nodejs-api#getformatter
 *
 * If an output file has been provided as a command line argument, it is returned.
 *
 * @param {Array.<String>} processArgs An array of command line arguments
 * @returns {FormatterConfig} the formatter configuration
 */
function getFormatterConfigFromProcessArgs(processArgs) {
  let config = {
    name: DEFAULT_FORMATTER_NAME,
    outputFile: '',
  };
  for (let arg of processArgs) {
    if (arg.startsWith(FORMATTER_FLAG)) {
      config.name = arg.replace(FORMATTER_FLAG, '');
    }
    if (arg.startsWith(OUTPUT_FLAG)) {
      config.outputFile = arg.replace(OUTPUT_FLAG, '');
    }
  }
  return config;
}

/**
 * Returns the formatter configuration : the formatter name and the output file.
 *
 * If a formatter name has been provided as a command line argument , it is returned. Otherwise,the
 * default formatter name `stylish` is returned.
 *
 * More information can be found in https://eslint.org/docs/developer-guide/nodejs-api#getformatter
 *
 * If an output file has been provided as a command line argument, it is returned.
 *
 * @returns {FormatterConfig} the formatter configuration
 */
function getFormatterConfig() {
  return getFormatterConfigFromProcessArgs(process.argv);
}

/**
 * Creates directories if missing corresponding to a provided file path
 *
 * @param {String} directoryStructure The file path
 */
function createDirectoriesIfMissing(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  createDirectoriesIfMissing(dirname);
  fs.mkdirSync(dirname);
}

module.exports = {
  getFormatterConfigFromProcessArgs,
  getFormatterConfig,
  createDirectoriesIfMissing,
};
