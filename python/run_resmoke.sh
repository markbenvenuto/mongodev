#!/bin/sh
echo Running Test Script

PYTHON=$1
RESMOKE=$2
RELATIVE_TEST_FILE=$3
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
RESMOKE_ARGS=$($PYTHON $DIR/get_test_cmd.py $RELATIVE_TEST_FILE)

echo $PYTHON $RESMOKE run $RESMOKE_ARGS "--mongodSetParameters={featureFlagTenantMigrations: true,featureFlagAuthorizationContract: true}"
$PYTHON $RESMOKE run $RESMOKE_ARGS "--mongodSetParameters={featureFlagTenantMigrations: true,featureFlagAuthorizationContract: true}"
