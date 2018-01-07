/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const path = require('path');
const spawn = require('child_process').spawn;
const chalk = require('chalk');

const {isJUnitEnabled, writeJunitReport} = require('../shared/reporting');

const extension = process.platform === 'win32' ? '.cmd' : '';
const spawnOptions = isJUnitEnabled() ? {} : {stdio: 'inherit'};

let createReport = () => {};
let reportChunks = [];

const flow = spawn(
  path.join('node_modules', '.bin', 'flow' + extension),
  ['check', '.'],
  spawnOptions
);

flow.on('close', function(code) {
  if (code !== 0) {
    console.error(chalk.red.bold('Flow failed'));
    createReport(false);
  } else {
    console.log(chalk.green.bold('Flow passed'));
    createReport(true);
  }
  if (reportChunks.length > 0) {
    let reportJSON = reportChunks.join('');
    console.log(reportJSON);
  }
  process.exit(code);
});

if (isJUnitEnabled()) {
  flow.stdout.on('data', data => {
    createReport = stepHasSucceeded => {
      if (!stepHasSucceeded) {
        reportChunks.push(data);
      }
      writeJunitReport('flow', data, stepHasSucceeded);
    };
  });
}
