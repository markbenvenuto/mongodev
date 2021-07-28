#!/bin/sh
echo Running Test Script

PYTHON=$1
RESMOKE=$2
RELATIVE_TEST_FILE=$3
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
RESMOKE_ARGS=$($PYTHON $DIR/get_test_cmd.py $RELATIVE_TEST_FILE)

# To test feature flags, add the following to each of the lines
# Be careful with quoting and spacing
# 1. You must quote
# 2. You must have a space after : (i.e. the colon) in yaml
# "--mongodSetParameters={featureFlagTenantMigrations: true,featureFlagAuthorizationContract: true}"

echo $PYTHON $RESMOKE run $RESMOKE_ARGS
$PYTHON $RESMOKE run $RESMOKE_ARGS