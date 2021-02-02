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

    if file.startswith("jstests"):
        parts = file.split("/")

        assert len(parts) == 3
        suite = parts[1]

        # Replica sets needs to be expanded out
        suite = suite.replace("replsets", "replica_sets")

        camel_to_snake(suite)

        return suite

    # Handle enterprise
    if file.startswith("src"):
        parts = file.split("/")

        assert len(parts) == 8
        suite = parts[6]

        camel_to_snake(suite)

        return suite


if __name__ == "__main__":

    relative_test_file = sys.argv[1]
    print("--suite=%s %s" %(get_suite(relative_test_file), relative_test_file))
