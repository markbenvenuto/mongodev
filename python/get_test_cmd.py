import argparse
import os.path
import sys

def camel_to_snake(suite):
    # Convert from camel case to snake case
    orig = suite
    suite = ''
    for x in orig:
        if x.isupper():
            suite += '_' + x.lower()
        else:
            suite += x

    return suite

def get_suite(file):

    if file.endswith("test1.log"):
        with open(file) as rfh:
            line = rfh.readline()
            count = 1
            while count < 10:
                if "--suite" in line:
                    idx = line.find("--suite")
                    return line[idx+8:]

                count += 1
                line = rfh.readline()

            return "failed_to_find_suite_in_test1.log"


    # Handle enterprise
    if "enterprise" in file:
        idx = file.find("jstests")
        file = file[idx:]
        parts = file.split("/")

        # assert len(parts) == 8
        suite = parts[1]

        camel_to_snake(suite)

        suite = suite.replace("encryptdb", "ese")

        return suite

    if "jstests" in file:
        idx = file.find("jstests")
        file = file[idx:]
        parts = file.split("/")

        # assert len(parts) == 3
        suite = parts[1]

        # Replica sets needs to be expanded out
        suite = suite.replace("replsets", "replica_sets")

        suite = camel_to_snake(suite)

        suite = suite.replace("free_mon", "free_monitoring")

        # if suite not in ["auth", "no_passthrough"]:
        #     suite += "_auth"

        return suite


if __name__ == "__main__":

    relative_test_file = sys.argv[1]
    print('--suite=%s %s' %(get_suite(relative_test_file), relative_test_file))

