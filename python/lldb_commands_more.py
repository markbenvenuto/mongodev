"""Add user-defined commands to MongoDB."""

import argparse
import shlex
import lldb
import cxxfilt

def __lldb_init_module(debugger, *_args):
    """Register custom commands."""
    # debugger.HandleCommand(
        # "command script add -o -f lldb_commands_more.StopAttachHandler  mongodb-stop-attach-handler")
    # debugger.HandleCommand("command alias mongodb-help help")
    debugger.HandleCommand(
        "command script add -o -f lldb_commands_more.DumpClient mongodb-dc")
    debugger.HandleCommand(
        "command script add -o -f lldb_commands.BreakpointOnMAssert mongodb-breakpoint-massert")
    debugger.HandleCommand("type synthetic add -x '^mongo::Decorable<.+>$' --python-class lldb_commands_more.DecorablePrinter")

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

# TODO - should we set one bp on all uassert/massert
def BreakpointOnMAssert(debugger, command, _exec_ctx, _result, _internal_dict):  # pylint: disable=invalid-name
    """Set a breakpoint on MongoDB massert that throws the specified error code."""

    arg_strs = shlex.split(command)

    parser = argparse.ArgumentParser(description='Set a breakpoint on a msassert code.')
    parser.add_argument('code', metavar='N', type=int, help='uassert code')
    args = parser.parse_args(arg_strs)

    debugger.HandleCommand(
        "breakpoint set -n mongo::msgassertedWithLocation -c \"(int)status._error.px->code == %s\"" %
        args.code)



def DumpClient(_debugger, _command, exec_ctx, _result, _internal_dict):  # pylint: disable=invalid-name
    """Dump the client."""

    # arg_strs = shlex.split(command)

    gsc_list = exec_ctx.target.FindGlobalVariables("globalServiceContext", 1)
    print(gsc_list)
    gsc = gsc_list[0]
    decorations = gsc.GetChildMemberWithName("_decorations")
    registry = decorations.GetChildMemberWithName("_registry")
    decoration_info = registry.GetChildMemberWithName("_decorationInfo")
    decoration_data = decorations.GetChildMemberWithName("_decorationData").child[0]

    print(decoration_info.num_children)
    for child in range(decoration_info.num_children):
        di = decoration_info.children[child]
        constructor = di.GetChildMemberWithName("constructor").__str__()
        index = di.GetChildMemberWithName("descriptor").GetChildMemberWithName(
            "_index").GetValueAsUnsigned()

        type_name = constructor
        type_name = type_name[0:len(type_name) - 1]
        type_name = type_name[0:type_name.rindex(">")]
        type_name = type_name[type_name.index("constructAt<"):].replace("constructAt<", "")

        # If the type is a pointer type, strip the * at the end.
        if type_name.endswith('*'):
            type_name = type_name[0:len(type_name) - 1]
        type_name = type_name.rstrip()

        type_t = exec_ctx.target.FindTypes(type_name).GetTypeAtIndex(0)
        offset_ptr = decoration_data.GetChildAtIndex(index, False, True)

        value = offset_ptr.Cast(type_t)
        print(value)



def foo1():
    print("Hello")

# Get address of symbol in file, not current local of global variable
def global_symbol_address(target, name):
    print("looking up:  " + name)
    symbols = target.FindSymbols(name)
    print("aaa"+ str(len(symbols)))
    assert len(symbols) == 1

    return symbols[0].symbol.addr.GetLoadAddress(target)

def get_symbol_value(target, name):
    load_address = global_symbol_address(target, name)

    addr = target.ResolveLoadAddress(load_address).GetLoadAddress(target)

    # lldb.process.ReadMemory(addr, 8, lldb.SBError())
    err = lldb.SBError()
    ptr = target.process.ReadPointerFromMemory(addr, err)

    return ptr


def get_decorable_info(target, name):

    full_symbol = f"mongo::decorable_detail::gdbRegistry<{name}>"
    type = target.FindFirstType("mongo::decorable_detail::Registry")

    addr = target.ResolveLoadAddress( get_symbol_value(target, full_symbol))

    return target.CreateValueFromAddress("r1", addr, type)


DEMANGLE_CACHE={}

def demangle(internal_name):
    global DEMANGLE_CACHE

    if internal_name in DEMANGLE_CACHE:
        return DEMANGLE_CACHE[internal_name]

    # internal names like ones from typeInfo do not have the prefix "_ZN", just "N"
    full_name = cxxfilt.demangle(internal_name, external_only=False)

    DEMANGLE_CACHE[internal_name] = full_name

    return full_name

# TODO - Cache
def get_dec_list(target, name):


    di = get_decorable_info(target, name)

    entries = di.GetChildMemberWithName("_entries")
    # print(len(entries))
    el = []
    c = 0
    for i in range(len(entries)):

        # if c >= 5:
        #     break
        c += 1
        e = entries.GetChildAtIndex(i)

        ti = e.GetChildMemberWithName("_typeInfo")
        off = e.GetChildMemberWithName("_offset").GetValueAsUnsigned()
        # Strings are quoted with ""
        n = ti.GetChildMemberWithName("__name").GetSummary().replace('"', '')

        n = demangle(n)

        el.append((n, off))

    return el


# mongo::Decorable<mongo::ServiceContext>



class DecorablePrinter:
    """Pretty printer for absl::container_internal::raw_hash_set."""

    def __init__(self, valobj, *_args):
        """Store the valobj and get the value of the hash_set."""
        self.valobj = valobj
        self.decs = get_dec_list(valobj.target, "mongo::ServiceContext")
        print("decs: " + str(len(self.decs)))

    def num_children(self):  # pylint: no-method-argument
        """Match LLDB's expected API."""
        return len(self.decs)

    def get_child_index(self, name):  # pylint: disable=no-self-use,no-method-argument
        """Match LLDB's expected API."""
        return None

    def get_child_at_index(self, index):  # pylint: disable=no-self-use,no-method-argument
        d1 = self.decs[index]

        target = self.valobj.target

        type_obj = target.FindFirstType(d1[0])
        # print("ttt" + str(type_obj))
        # print("add:", type_obj.__class__)

        addr = target.ResolveLoadAddress(self.valobj.addr.GetLoadAddress(self.valobj.target) + d1[1])
        # print("add:", addr.__class__)

        v = target.CreateValueFromAddress(d1[0], addr , type_obj)
        # print("vvvv:" + str(v))

        return v


    def has_children():  # pylint: disable=no-self-use,no-method-argument
        """Match LLDB's expected API."""
        return True

# (lldb) image lookup -r -s ".*gdbRegistry.*"
#         (lldb) image lookup -s "mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>"
# 1 symbols match 'mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>' in /home/mark/mongo/mongod:
#         Address: mongod[0x0000000018ffea60] (mongod.PT_LOAD[3]..bss + 2848)
#         Summary: mongod`mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>

# script print(lldb.target.FindSymbols("mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>"))

#        https://github.com/jmarrec/LldbScripting/blob/main/LLDB_Scripting.ipynb

# print(lldb.target.FindSymbols("mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>")[0].symbol.GetStartAddress().GetLoadAddress(lldb.target))


#  memory read -s8 -fx   93825411656288



# 0x55556e552a80: 0x0000000000000001 0x0000000000000000
# 0x55556e552a90: 0x0000000000000000 0x0000000000000000
# (lldb) script print(lldb.target.FindSymbols("mongo::decorable_detail::gdbRegistry<mongo::ServiceContext>")[0].symbol.addr.load_addr)
# 93825411656288
# (lldb) script print(lldb.target.ResolveLoadAddress(0x000055556e6b8bb0)
# (lldb) script print(lldb.target.ResolveLoadAddress(0x000055556e6b8bb0))
# 0x55556e6b8bb0
# (lldb) script print(lldb.target.CreateValueFromAddress("r",  93825411656288,lldb.target.FindFirstType("mongo::decorable_detail::Registry") ))
# Traceback (most recent call last):
#   File "<input>", line 1, in <module>
#   File "/usr/lib64/python3.12/site-packages/lldb/__init__.py", line 11000, in CreateValueFromAddress
#     return _lldb.SBTarget_CreateValueFromAddress(self, name, addr, type)
#            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
# TypeError: in method 'SBTarget_CreateValueFromAddress', argument 3 of type 'lldb::SBAddress'
# (lldb) script print(lldb.target.CreateValueFromAddress("r",  lldb.target.ResolveLoadAddress(93825411656288),lldb.target.FindFirstType("mongo::decorable_detail::Registry") ))
# (mongo::decorable_detail::Registry) r = {
#   _entries = size=0 {
#     std::_Vector_base<mongo::decorable_detail::RegistryEntry, std::allocator<mongo::decorable_detail::RegistryEntry> > = {
#       _M_impl = {
#         std::_Vector_base<mongo::decorable_detail::RegistryEntry, std::allocator<mongo::decorable_detail::RegistryEntry> >::_Vector_impl_data = {
#           _M_start = 0x000055556e6b8bb0
#           _M_finish = 0x000055556eb64600
#           _M_end_of_storage = 0x000055556eb645f0
#         }
#       }
#     }
#   }
#   _bufferSize = 54
# }
# (lldb) script print(lldb.target.CreateValueFromAddress("r",  lldb.target.ResolveLoadAddress(0x000055556e6b8bb0),lldb.target.FindFirstType("mongo::decorable_detail::Registry") ))
# (mongo::decorable_detail::Registry) r = {
#   _entries = size=204 {
#     std::_Vector_base<mongo::decorable_detail::RegistryEntry, std::allocator<mongo::decorable_detail::RegistryEntry> > = {
#       _M_impl = {
#         std::_Vector_base<mongo::decorable_detail::RegistryEntry, std::allocator<mongo::decorable_detail::RegistryEntry> >::_Vector_impl_data = {
#           _M_start = 0x000055556e913560
#           _M_finish = 0x000055556e915540
#           _M_end_of_storage = 0x000055556e915d60
#         }
#       }
#     }
#   }
#   _bufferSize = 21241
# }
