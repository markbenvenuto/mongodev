#!/bin/bash
#set -x

#echo ARGS $*

# ninja_file=$1
#echo FILE $FILE_NAME

MRLOG=$1
NINJA_FILE=$2
FILE_NAME=$3

BASE_COMMAND="ninja -f $NINJA_FILE  -j 200 -k 0"

if [[ "$FILE_NAME" =~ .*_test.*.cpp ]]; then
    TEST_NAME=$(echo $FILE_NAME | sed "s#.*\/\(.*\).cpp#\1#")

    echo "$MRLOG" -c -e ninja -- -f "$NINJA_FILE" -j 200 -k 0 "+$TEST_NAME"
    $MRLOG -c -e ninja -- -f "$NINJA_FILE" -j 200 -k 0 "+$TEST_NAME"

elif [[ "$FILE_NAME" =~ .*_bm.cpp ]]; then
    TEST_NAME=$(echo $FILE_NAME | sed "s#.*\/\(.*\).cpp#\1#")

    echo "$MRLOG" -c -e ninja -- -f "$NINJA_FILE" -j 200 -k 0 "+$TEST_NAME"
    $MRLOG -c -e ninja -- -f "$NINJA_FILE" -j 200 -k 0 "+$TEST_NAME"

elif [[ "$FILE_NAME" =~ .*.js ]]; then
    #./mongo "$FILE_NAME"
    echo ./mongo --setShellParameter  $FILE_NAME
    ./mongo --setShellParameter  $FILE_NAME
else
    echo "$BASE_COMMAND" install-devcore
    $BASE_COMMAND install-devcore
fi
