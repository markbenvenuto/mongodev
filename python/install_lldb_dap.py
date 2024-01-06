#!/usr/bin/env python

import os
import shutil
import os.path
import sys



def install_lldb_dap(lldb_bin, lldb_src):
    home_dir = os.path.expanduser("~")
    vscode_dir = os.path.join(home_dir, ".vscode-server", "extensions")
    ext_dir = os.path.join(vscode_dir, "llvm-org.lldb-dap-0.1.0")

    if not os.path.exists(lldb_bin) :
        print(f"ERROR: Could not find lldb bin {lldb_bin}")
        return

    if not os.path.exists(lldb_src) :
        print(f"ERROR: Could not find lldb src {lldb_src}")
        return

    if not os.path.exists(vscode_dir):
        print(f"ERROR: Could not find vscode dir {vscode_dir}")
        return

    if os.path.exists(ext_dir):
        print(f"ERROR: Directory {ext_dir} already exists")
        return

    # Make directories we need
    os.makedirs(ext_dir)

    os.makedirs(os.path.join(ext_dir, "bin"))

    # Copy over package.json
    # TODO - check file exists
    dap_src = os.path.join(lldb_src, "lldb/tools/lldb-dap")
    shutil.copyfile(os.path.join(dap_src, "package.json"), os.path.join(ext_dir, "package.json"))

    bin_dap  = os.path.join(lldb_bin, "lldb-dap")

    # Symlink vscode-dap
    if not os.path.isfile(bin_dap):
        print(f"ERROR: The file '{bin_dap}' does not exist.")
        return


    os.symlink(bin_dap, os.path.join(ext_dir, "bin", "lldb-dap"))

    # Sym link the lib dir because lldb-dap may be linked against a shared library
    os.symlink(os.path.join(lldb_bin, "..", "lib"), os.path.join(ext_dir, "lib"))


if __name__ == "__main__":

    # relative_test_file = sys.argv[1]

    src = "/home/ubuntu/cc/llvm-project"
    bin = "/home/ubuntu/cc/build_opt/bin"

    install_lldb_dap(bin, src)
    print("Install complete")