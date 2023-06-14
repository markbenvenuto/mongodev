"""Add user-defined commands to MongoDB."""

import argparse
import shlex
import lldb

def __lldb_init_module(debugger, *_args):
    """Register custom commands."""
    # debugger.HandleCommand(
        # "command script add -o -f lldb_commands_more.StopAttachHandler  mongodb-stop-attach-handler")
    # debugger.HandleCommand("command alias mongodb-help help")


#######################
# Command Definitions #
#######################

stopped_once = False

# See man signal(7)
SIGSTOP = 19

def StopAttachHandler():
    global stopped_once

    t = lldb.thread
    if t.GetStopReason() == lldb.eStopReasonSignal and t.GetStopReasonDataAtIndex(0) == SIGSTOP:
        if stopped_once :
            print("STOPPED ONCE, ignoring SIGSTOP")
            return

        print("STOPPED DUE TO SIGSTOP\n")
        # Disable default handling of SIGSTOP by the debugger, ignore SIGSTOP from now on
        lldb.debugger.HandleCommand("process handle -s false SIGSTOP")
        lldb.debugger.HandleCommand("continue")
        stopped_once = True
    # else:
        # print("NOT STOPPED: %s" % (t.GetStopReason() ))
