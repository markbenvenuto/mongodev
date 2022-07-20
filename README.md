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

## Roadmap/TODO
SkunkWorks
Testing
- Todo - test with other ninja file generator
- Virtual Env support - Resmoke/Other scripts??
- Reload on config change?
- Package support files into bundle
Features
- add support for running in virtual env
- Add problem matches for gcc/msvc/unit tests
- Mongo specific process picker
  - https://github.com/aprilandjan/vscode-node-debug-process-picker
  - https://github.com/golang/vscode-go/blob/30b086f47878f2fcfa8d68d79db94ab6397a81c6/src/pickProcess.ts#L66
- Add mrlog bootstrapping - see https://github.com/rust-analyzer/rust-analyzer/blob/20a911f3cc2beb0409ab71cc1560648374745f7f/editors/code/src/main.ts#L160
- Speed up extension
  - see https://github.com/ipatalas/vscode-postfix-ts/blob/develop/package.json
  - https://jason-williams.co.uk/posts/speeding-up-vscode-extensions-in-2022/
Welcome
-- warn users about missing compile_commands.json
- on unknown unit test binary, tell user to check config file location
- Walkthrough?

Future
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

