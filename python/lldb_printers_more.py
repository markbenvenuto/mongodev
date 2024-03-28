"""LLDB Pretty-printers for MongoDB.

To import script in lldb, run:

   command script import buildscripts/lldb/lldb_printers.py

This file must maintain Python 2 and 3 compatibility until Apple
upgrades to Python 3 and updates their LLDB to use it.
"""
from __future__ import print_function

import base64
import bson
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



# Developing LLDB Printers
#
# See https://lldb.llvm.org/use/variable.html, https://lldb.llvm.org/use/python-reference.html,
# and https://lldb.llvm.org/python_api.html
#
# The key classes are SBValue (represents a variable) and SBData (the actual data in a field)
#
# LLDB is more strict with types then GDB. As such, this often means that SBValue pointer and references
# have to be walked to get to the real SBValue
#
# To experiment from the interactive prompt, use the following:
#
# script print(lldb.frame.FindVariable("this"))
#


#############################
# Pretty Printer Defintions #
#############################


def ConstDataRangePrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Pretty-Prints MongoDB Status objects."""
    print("CDR....................................")
    end = valobj.GetChildMemberWithName("_end")
    begin = valobj.GetChildMemberWithName("_begin")

    return "CDR(Len={})".format(end - begin)


def NamespaceStringPrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print NamespaceString value."""
    data = valobj.GetChildMemberWithName("_data")
    ptr = data.GetChildMemberWithName("_M_dataplus").GetChildMemberWithName("_M_p").GetValueAsUnsigned(0)
    if ptr == 0:
            return 'nullptr'

    size1 = data.GetChildMemberWithName("_M_string_length").GetValueAsUnsigned()
    if size1 == 1:
        return '""'

    descriminator = valobj.GetProcess().ReadMemory(ptr, 1, lldb.SBError())[0]

    data_offset = 1
    has_tenant = False
    if descriminator > 0x7f:
         has_tenant = True
         size1 = descriminator & 0x7f
         data_offset = 1 + 12
    else:
        size1 -=1

    # print(f"{has_tenant}-{size1}-{data_offset}")

    # return f"p: {ptr}, {size1}"

    # name = '"{}"'.format(valobj.GetProcess().ReadMemory(ptr + data_offset, size1, lldb.SBError()).decode("utf-8"))
    # TODO - handle collection names
    string_bytes = valobj.GetProcess().ReadMemory(ptr + data_offset, size1, lldb.SBError())
    if string_bytes is None:
        return 'nullptr'

    name = '"{}"'.format(string_bytes.decode("utf-8"))

    if not has_tenant:
         return name

    oid_bytes =valobj.GetProcess().ReadMemory(ptr + 1, 12, lldb.SBError())
    oid = bson.objectid.ObjectId(oid_bytes)

    return '"<{}>.{}"'.format(oid, name)


# TODO - OID decoder

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



def OIDPrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print ResourceIdPrinter value."""
    oid_bytes =valobj.GetProcess().ReadMemory(valobj.GetChildMemberWithName('_oid').AddressOf().GetValueAsUnsigned(0), 12, lldb.SBError())
    oid = bson.objectid.ObjectId(oid_bytes)

    return oid



def ValidatedTenancyScopePrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print ResourceIdPrinter value."""
    data = str(valobj.GetChildMemberWithName("_tenantOrUser"))
    # if "monostate" in data:
        #  return "<no tenant>"

    jwt = valobj.GetChildMemberWithName("_originalToken").GetSummary()

    # TODO - decode all pieces
    pieces = jwt.split(".")

    jp = []
    for p in pieces:
        p1 = p
        if len(p) % 4 == 3:
            p1 += "="
        elif len(p) % 4 == 2:
            p1 += "=="
        jp.append(base64.b64decode(p1))

    # jwt = jwt.replace(".", "")

    return str(jp)


def StringDataPrinter(valobj, *_args):  # pylint: disable=invalid-name
    """Print StringData value."""
    sv = valobj.GetChildMemberWithName("_sv")

    size1 = sv.GetChildMemberWithName("_M_len").GetValueAsUnsigned(0)
    if size1 == 0:
        return 'nullptr2'

    ptr = sv.GetChildMemberWithName("_M_str").GetValueAsUnsigned()
    if ptr == 0:
        return 'nullptr3'

    return '"{}"'.format(valobj.GetProcess().ReadMemory(ptr, size1, lldb.SBError()).decode("utf-8"))


def __lldb_init_module(debugger, *_args):
    """Register pretty printers."""
    debugger.HandleCommand("type summary add mongo::ConstDataRange -F lldb_printers_more.ConstDataRangePrinter")
    debugger.HandleCommand("type summary add mongo::DataBuilder -F lldb_printers_more.ConstDataRangePrinter")

    debugger.HandleCommand("type summary add mongo::NamespaceString -F lldb_printers_more.NamespaceStringPrinter'")
    debugger.HandleCommand("type summary add mongo::ResourcePattern --summary-string '${var._matchType}:${var._ns}'")
    # DatabaseName and Namespacestring have the same layout
    debugger.HandleCommand("type summary add mongo::DatabaseName -F lldb_printers_more.NamespaceStringPrinter'")

    debugger.HandleCommand("type summary add mongo::ResourceId -F lldb_printers_more.ResourceIdPrinter'")

    debugger.HandleCommand("type summary add mongo::auth::ValidatedTenancyScope -F lldb_printers_more.ValidatedTenancyScopePrinter'")

    debugger.HandleCommand("type summary add mongo::OID -F lldb_printers_more.OIDPrinter'")

    debugger.HandleCommand("type summary add mongo::StringData -F lldb_printers_more.StringDataPrinter")


print("Loading lldb_printers_more.py done...")
