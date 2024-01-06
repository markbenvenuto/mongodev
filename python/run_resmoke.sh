#!/bin/bash
echo run_resmoke.sh: Running Test Script
set -x

PYTHON=$1
RESMOKE=$2
MONGODB_WAIT_FOR_DEBUGGER=$3
RELATIVE_TEST_FILE=$4
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "CWD: $PWD"
echo "DEBUGGER_MODE: $MONGODB_WAIT_FOR_DEBUGGER"

if [[ $MONGODB_WAIT_FOR_DEBUGGER -eq 1 ]];
then
    echo "Enabling Debugger mode for MongoDB"
    export MONGODB_WAIT_FOR_DEBUGGER
fi

echo run_resmoke.sh: Mapping JSTest to suite with '"$PYTHON" "$DIR/get_test_cmd.py" "$RELATIVE_TEST_FILE"'
RESMOKE_ARGS=$($PYTHON "$DIR/get_test_cmd.py" "$RELATIVE_TEST_FILE")

# To test feature flags, add the following to each of the lines
# Be careful with quoting and spacing
# 1. You must quote
# 2. You must have a space after : (i.e. the colon) in yaml
# "--mongodSetParameters={featureFlagTenantMigrations: true,featureFlagAuthorizationContract: true}"

echo "$PYTHON $RESMOKE" run $RESMOKE_ARGS --runAllFeatureFlagTests
$PYTHON "$RESMOKE" run $RESMOKE_ARGS --runAllFeatureFlagTests

# echo "$PYTHON $RESMOKE" run $RESMOKE_ARGS
# $PYTHON "$RESMOKE" run $RESMOKE_ARGS
