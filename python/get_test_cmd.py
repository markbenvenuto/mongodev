import argparse
import os.path
import sys

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


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

def get_suite(file_name):

    if file_name.endswith("test1.log"):
        with open(file_name) as rfh:
            line = rfh.readline()
            eprint("Line:" + line)
            count = 1
            while count < 10:
                if "--suite" in line:
                    idx = line.find("--suite")
                    return "--suite=" + line[idx+8:].rstrip()

                count += 1
                line = rfh.readline()
                eprint("Line:" + line)

            return "failed_to_find_suite_in_test1.log"



    # Handle enterprise
    if "enterprise" in file_name:
        idx = file_name.find("jstests")
        file = file_name[idx:]
        parts = file.split("/")

        # assert len(parts) == 8
        suite = parts[1]

        camel_to_snake(suite)

        suite = suite.replace("encryptdb", "ese")

        return '--suite=%s %s' %(suite, file_name)

    if "jstests" in file_name:
        idx = file_name.find("jstests")
        file = file_name[idx:]
        parts = file.split("/")

        # assert len(parts) == 3
        suite = parts[1]

        # Replica sets needs to be expanded out
        suite = suite.replace("replsets", "replica_sets")

        suite = camel_to_snake(suite)

        suite = suite.replace("free_mon", "free_monitoring")

        # if suite not in ["auth", "no_passthrough"]:
        #     suite += "_auth"

        return '--suite=%s %s' %(suite, file_name)



if __name__ == "__main__":

    relative_test_file = sys.argv[1]
    print(get_suite(relative_test_file))

