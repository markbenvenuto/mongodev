#!/usr/bin/env python

import os
import shutil
import os.path
import sys


def install_mongodev(ext_src):
    home_dir = os.path.expanduser("~")
    vscode_dir = os.path.join(home_dir, ".vscode-server", "extensions")
    ext_dir = os.path.join(vscode_dir, "markbenvenuto.mongodev-0.0.1")

    if not os.path.exists(ext_src) :
        print(f"ERROR: Could not find ext src {ext_src}")
        return

    if not os.path.exists(vscode_dir):
        print(f"ERROR: Could not find vscode dir {vscode_dir}")
        return

    if os.path.exists(ext_dir):
        print(f"ERROR: Directory {ext_dir} already exists")
        return

    os.symlink(ext_src, ext_dir)


if __name__ == "__main__":

    # relative_test_file = sys.argv[1]

    src = "/home/ubuntu/src/mongodev"

    install_mongodev(src)
    print("Install complete")