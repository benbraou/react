/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {getFormatterConfigFromProcessArgs} = require('../eslint.utils');

describe('getFormatterConfigFromProcessArgs', () => {
  it('should work with empty process arguments', () => {
    expect(getFormatterConfigFromProcessArgs([])).toEqual({
      name: 'stylish',
      outputFile: '',
    });
  });
  it('should work when provided a formatter name', () => {
    expect(getFormatterConfigFromProcessArgs(['--formatter=junit'])).toEqual({
      name: 'junit',
      outputFile: '',
    });
  });
  it('should work when provided a file output path', () => {
    expect(
      getFormatterConfigFromProcessArgs([
        'Hello',
        '--output=some/path/result.xml',
      ])
    ).toEqual({
      name: 'stylish',
      outputFile: 'some/path/result.xml',
    });
  });
  it('should work when provided a formatter name and a file output path', () => {
    expect(
      getFormatterConfigFromProcessArgs([
        'Hi',
        '--output=some/path/result.xml',
        'Hello',
        '--formatter=junit',
      ])
    ).toEqual({
      name: 'junit',
      outputFile: 'some/path/result.xml',
    });
  });
});

