"""LLDB Pretty-printers for MongoDB.

To import script in lldb, run:

   command script import buildscripts/lldb/lldb_printers.py

This file must maintain Python 2 and 3 compatibility until Apple
upgrades to Python 3 and updates their LLDB to use it.
"""
from __future__ import print_function

import string
import struct
import sys
import uuid

import lldb

# try:
#     import bson
#     import collections
#     from bson import json_util
#     from bson.codec_options import CodecOptions
# except ImportError:
#     print("Warning: Could not load bson library for Python {}.".format(sys.version))
#     print("Check with the pip command if pymongo 3.x is installed.")
#     bson = None



#############################
# Pretty Printer Defintions #
#############################


# def ConstDataRangePrinter(valobj, *_args):  # pylint: disable=invalid-name
#     """Pretty-Prints MongoDB Status objects."""
#     print("CDR....................................")
#     end = valobj.GetChildMemberWithName("_end")
#     begin = valobj.GetChildMemberWithName("_begin")

#     return "CDR(Len={})".format(end - begin)


def NamespaceStringPrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print NamespaceString value."""
    data = valobj.GetChildMemberWithName("_data")
    ptr = data.GetChildMemberWithName("_M_dataplus").GetChildMemberWithName("_M_p").GetValueAsUnsigned(0)
    if ptr == 0:
            return 'nullptr'

    size1 = data.GetChildMemberWithName("_M_string_length").GetValueAsUnsigned()
    if size1 == 1:
        return '""'

    # return f"p: {ptr}, {size1}"
    # Skip first byte
    return '"{}"'.format(valobj.GetProcess().ReadMemory(ptr + 1, size1 - 1, lldb.SBError()).decode("utf-8"))



def extract_first_3_bits(num: int) -> int:
    """
    Extracts the first 3 bits of a 64-bit integer and returns it as a number between 0 and 7 inclusive.
    """
    # Convert the integer to binary representation
    binary_num = bin(num)[2:]

    # Pad the binary representation with zeros to make it 64 bits long
    binary_num = binary_num.zfill(64)

    # Extract the first 3 bits of the binary representation
    first_3_bits = binary_num[:3]

    # Convert the first 3 bits to an integer
    first_3_bits_int = int(first_3_bits, 2)

    # Return the integer between 0 and 7 inclusive
    return first_3_bits_int % 8


def ResourceIdPrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print ResourceIdPrinter value."""
    data = valobj.GetChildMemberWithName("_fullHash").GetValueAsUnsigned(0)
    return extract_first_3_bits(data)


def __lldb_init_module(debugger, *_args):
    """Register pretty printers."""
    # debugger.HandleCommand("type summary add mongo::ConstDataRange -F lldb_printers_more.ConstDataRangePrinter")
    # debugger.HandleCommand("type summary add mongo::DataBuilder -F lldb_printers_more.ConstDataRangePrinter")

    debugger.HandleCommand("type summary add mongo::NamespaceString -F lldb_printers_more.NamespaceStringPrinter'")
    debugger.HandleCommand("type summary add mongo::ResourcePattern --summary-string '${var._matchType}:${var._ns}'")

    debugger.HandleCommand("type summary add mongo::ResourceId -F lldb_printers_more.ResourceIdPrinter'")


print("Loading lldb_printers_more.py done...")
