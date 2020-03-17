# mongodev README

MongoDB Development VS Code Extension
This is not for using MongoDB - see https://github.com/mongodb-js/vscode

## Features

- Syntax highlighting for MongoDB .log files and Test logs
    -- Recognizes files with .log as "mongolog" files so syntax highlighting purposes
- Task Provider for Resmoke
- Diagnostics Provide for log files

## Requirements

Resmoke task provider only works in Mongo repo

## Install

Since it is not on the marketplace and may never be

1. `npm install && npm run compile`
2. `ln -s ``pwd``  ~/.vscode/extensions/markbenvenuto.mongodev-0.0.1`

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

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

