# mongodev README

MongoDB Development VS Code Extension
This is not for using MongoDB - see https://github.com/mongodb-js/vscode

## Features

- Syntax highlighting for MongoDB .log files and Test logs
  - Recognizes files with `.log` as `mongolog` files so syntax highlighting purposes
  - Recognizes errors in log files and marks them as "Problems" with red siggly
- Resmoke integration
  - Runs tests with resmoke and opens log files into new window
- Run Test
  - Adds CodeLens for `Run Tests` and `Debug` to unit tests

## Requirements

1. Ninja must be installed and in path
2. Ubuntu 18.04/Fedora 30+ Linux Or macOS 10.14+
3. Assumes `python3` is installed and in path. If `python3` is named `python`, you will need to update settings.
4. Resmoke task provider only works in Mongo repo


## Install

Since it is not on the marketplace and may never be

1. `npm install && npm run compile`
2. `ln -s ``pwd``  ~/.vscode/extensions/markbenvenuto.mongodev-0.0.1`

If you want to install it directly on a remote development side

2. `ln -s ``pwd``  ~/.vscode-server/extensions/markbenvenuto.mongodev-0.0.1`


# Done
Cleanup
- errorcodes.py integration?
- slightly better build
- SuperRun
- SuperRun.sh?
- Add problem matches for gcc/msvc/unit tests
- Virtual Env support - Resmoke/Other scripts??
- add support for running in virtual env
- Package support files into bundle - done automatically by vsce
- Todo - test with other ninja file generator
Walkthrough
- Create Python Virtual Environment - should be setup by "./evergreen host configure --project mongodb-mongo-master"
- Python install requirements
- Create Ninja file
- Create Compile_Commands.json
Debugger
- Add command to attach to all mongod, all mongos or mongod & mongos

## Roadmap/TODO
SkunkWorks
Testing
- Reload on config change?
Features
- Mongo specific process picker
  - https://github.com/aprilandjan/vscode-node-debug-process-picker
  - https://github.com/golang/vscode-go/blob/30b086f47878f2fcfa8d68d79db94ab6397a81c6/src/pickProcess.ts#L66
- Add mrlog bootstrapping - see https://github.com/rust-analyzer/rust-analyzer/blob/20a911f3cc2beb0409ab71cc1560648374745f7f/editors/code/src/main.ts#L160
Welcome
- warn users about missing compile_commands.json
- warn users about missing build.ninja
- warn users about out of date compile_commands.json
- add command to generate build.ninja
- on unknown unit test binary, tell user to check config file location
- Walkthrough?
MLIR visualizer ideas
https://discourse.llvm.org/t/psa-mlir-visualizers-for-lldb-16/67145
Also see lldb_bson.py in mongo-c-driver

TODO
- test code lens - report error if ninja file is not found
- test code lens - configurable env variables

Future
MPF
- auto download
MRLOG
- auto download
New Commands
- Add ability to run current selected test without codelens
- Add ability to debug current selected test without codelens
- Add jump to nearest SConscript - see https://github.com/clangd/vscode-clangd/blob/master/src/switch-source-header.ts
Testing
- Add unit tests for extension - python extension has good examples
- Use Mocha for unit tests of JS - https://mochajs.org
Other?
- make my own LSP for IDL - see https://docs.rs/lsp-server/0.5.2/lsp_server/
- make my own LSP for ID error message to log line
- run single mongodb file? - make just use mongodb extension? or simple task?
Use Rust more?
 https://jason-williams.co.uk/posts/speeding-up-vscode-extensions-in-2022/
LSP to support jump to test maybe?
Debugger
- MPF Tree view for debugging?
Resmoke Debugger
- CustomExecutionTask
- parse output and start debuggers
- modify mongod/mongos to wait for debugger?


## KeyBindings

Since it does not install any keybindings, you may want to install some.

Example:
```
    {
        "key": "shift+cmd+v",
        "command": "workbench.action.tasks.runTask",
        "args" : "mongodev: Resmoke"
    }
```

## Extension Settings

**TODO**
Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

None

## Release Notes

None

### 1.0.0

Initial release of ...

