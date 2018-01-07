#!/bin/bash

TEMPORARY_LOG_FILE="local_size_measurements-errors.log"

. ./scripts/circleci/common.sh

# Update the local size measurements to the master version
# so that the size diff printed at the end of the build is
# accurate.
process_command "build" "$REPORT_FORMATTER" "$TEMPORARY_LOG_FILE" curl \
  -sS -o scripts/rollup/results.json http://react.zpao.com/builds/master/latest/results.json

set -e

yarn build --extract-errors

# Note: since we run the full build including extracting error codes,
# it is important that we *don't* reset the change to `scripts/error-codes/codes.json`.
# When production bundle tests run later, it needs to be available.
# See https://github.com/facebook/react/pull/11655.

# Do a sanity check on bundles

yarn lint-build
