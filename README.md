# mongodev README

MongoDB Development VS Code Extension
This is not for using MongoDB - see https://github.com/mongodb-js/vscode

## Features

- Syntax highlighting for MongoDB .log files and Test logs
  - Recognizes files with .log as "mongolog" files so syntax highlighting purposes
- Task Provider for Resmoke
- Diagnostics Provide for log files

## Requirements

1. Ninja must be installed and in path
2. Ubuntu 18.04/Fedora 30+ Linux Or macOS
3. Assumes python3 is installed and in path
4. Resmoke task provider only works in Mongo repo


## Install

Since it is not on the marketplace and may never be

1. `npm install && npm run compile`
2. `ln -s ``pwd``  ~/.vscode/extensions/markbenvenuto.mongodev-0.0.1`
   
If you want to install it directly on a remote development side

2. `ln -s ``pwd``  ~/.vscode-server/extensions/markbenvenuto.mongodev-0.0.1`


## Roadmap/TODO
- Add mrlog intergration
- Add ability to re-run test1.log by sniffing file for last command
- Code Lens integration for debug
- Add ability to run current selected test without codelens
- Add config settings for python, mrlog, scroll context, ninja file to use
- Todo - test with other ninja file generator
- Add problem matches for gcc/msvc/unit tests
- Add task definition for generate compiledb
- 

## KeyBindings

Since it does not install any keybindings, you may want to install some.

Example:
```
    {
        "key": "shift+cmd+v",
        "command": "workbench.action.tasks.runTask",
        "args" : "Resmoke test runner: Resmoke"
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

