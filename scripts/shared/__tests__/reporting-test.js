/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const {
  buildXMLOutputAsSingleTest,
  getPartialJUnitReportFileName,
} = require('../reporting');

describe('junitReport', () => {
  describe('buildXMLOutputAsSingleTest', () => {
    it('should handle test failures', () => {
      expect(
        buildXMLOutputAsSingleTest('Hello', 'flow', false).replace(/\s+/g, '')
      ).toEqual(
        `<?xml version="1.0"?>
      <testsuites>

        <testsuite package="flow" time="0" tests="1" errors="1" name="FLOW">
          <testcase time="0" name="flow merged report">
            <failure message=""><![CDATA[
    Hello
            ]]>
            </failure>
          </testcase>
        </testsuite>

      </testsuites>`.replace(/\s+/g, '')
      );
    });
    it('should handle tests passing', () => {
      expect(
        buildXMLOutputAsSingleTest('', 'flow', true).replace(/\s+/g, '')
      ).toEqual(
        `<?xml version="1.0"?>
      <testsuites>
        <testsuite package="flow" time="0" tests="1" errors="0" name="FLOW">
          <testcase time="0" name="flow merged report">
          </testcase>
        </testsuite>
      </testsuites>`.replace(/\s+/g, '')
      );
    });
  });
});

describe('getPartialJUnitReportFileName', () => {
  it('should return a correct JUnit report file name provided a base name and an index', () => {
    expect(getPartialJUnitReportFileName('base.xml', 2)).toBe('base2.xml');
  });
});
