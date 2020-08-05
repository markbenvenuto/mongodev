// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mongodev" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	const collection = vscode.languages.createDiagnosticCollection('mongodev');

	registerDiagnostics(context, collection);

	registerTaskProviderAndListeners(context, collection);

	context.subscriptions.push(disposable);
}

function registerDiagnostics(context: vscode.ExtensionContext, collection: vscode.DiagnosticCollection) {
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor.document, collection);
	}

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDiagnostics(editor.document, collection);
		}
	}));

}

// Tuples of RegEx to search for and message to display for user
let errorMatchers: Array<[RegExp, string]> = [
	[/BACKTRACE/, "Assertion"],
	[/BadValue:.*/, "BadValue error"],
	[/failed to load:.*/, "failed to load file"],
	[/uncaught exception:.*/, "Uncaught Javascript exception"],
	[/assert failed.*/, "JS Assert failed"],
	[/assert.*are not equal/, "JS Equality Assert failed"],
	[/mongo program was not running at.*/, "Mongo Program had bad exit"],
	[/Invalid access.*/, "Mongo Program crashed"],
	[/Got signal.*/, "Mongo Program got fatal signal"],
];

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	if (document && path.basename(document.uri.fsPath).match(/(.*.log|log[_A-Za-z0-9]*|log_.*)/)) {
		collection.delete(document.uri);

		const text = document.getText();

		let line_num = 0;
		const lines = text.split("\n");
		let diags: Array<vscode.Diagnostic> = [];

		for (const line of lines) {
			for (const em of errorMatchers) {
				const match = line.match(em[0]);
				if (match) {
					let pos = match.index ?? 0;
					diags.push({
						code: '',
						message: em[1],
						range: new vscode.Range(new vscode.Position(line_num, pos), new vscode.Position(line_num, pos + match[0].length)),
						severity: vscode.DiagnosticSeverity.Error,
						source: 'mongodev'
					});
				}
			}
			line_num += 1;
		}

		if (diags.length > 0) {
			collection.set(document.uri, diags);
		}
	}
}

function registerTaskProviderAndListeners(context: vscode.ExtensionContext, collection: vscode.DiagnosticCollection) {

	let type = "resmokeProvider";
	let testFile = path.join(vscode.workspace.rootPath!, `test1.log`);
	let cwd = vscode.workspace.rootPath;
	// TODO - make python path configurable and warn user if we cannot find on load
	// use getConfiguration.Update();
	// Note: There is no way to get the ${relativeFile} value from the task execution
	// so we hard code the output file
	let cmd = `python3 ${vscode.workspace.rootPath}/buildscripts/resmoke.py run \${relativeFile} 2>&1 | tee ` + testFile;

	// TODO - make async
	if (!fs.existsSync(path.join(vscode.workspace.rootPath!, "SConstruct"))) {
		console.log("Could not find SConstruct, falling back to extension test mode");
		cmd = "python3 /Users/mark/mongo/buildscripts/resmoke.py jstests/ssl/test1.js 2>&1 | tee " + testFile;
		cwd = "/Users/mark/mongo";
	}

	vscode.tasks.registerTaskProvider(type, {
		provideTasks(token?: vscode.CancellationToken) {
			let execution = new vscode.ShellExecution(cmd, {
				cwd: cwd,
			});
			let t =
				new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
					"Resmoke", "mongodev", execution)
				;

			t.group = vscode.TaskGroup.Test;
			t.runOptions.reevaluateOnRerun = true;
			t.source = "Resmoke test runner";

			return [t];
		},
		resolveTask(_task: vscode.Task, token?: vscode.CancellationToken) {
			return _task;
		}
	});

	// vscode.tasks.onDidEndTask((a) => {
	// 		console.log('onDidEndTask ' + a.execution.task.name);
	// });
	// vscode.tasks.onDidEndTaskProcess((a) => {
	// 		console.log('onDidEndTaskProcess ' + a.execution.task.name);
	// });
	// vscode.tasks.onDidStartTask((a) => {
	// 		console.log('onDidStartTask ' + a.execution.task.name);
	// });
	vscode.tasks.onDidStartTaskProcess((a) => {
		if (a.execution.task.name === "Resmoke") {
			// Clear the diagnostics for the test log file
			// since vs code will show an empty file once the tests start running
			// so an empty file cannot have errors.
			collection.delete(vscode.Uri.file(testFile));
		}
	});
	vscode.tasks.onDidEndTaskProcess((a) => {
		console.log('onDidStartTaskProcess ' + a.execution.task.name);

		if (a.execution.task.name === "Resmoke") {
			let e = a.execution.task.execution;
			if (e !== undefined) {
				//console.log('onDidStartTaskProcess ' + e!.commandLine);

				// TODO - check a.exitCode and maybe only open files on failure
				var openPath = vscode.Uri.file(testFile);
				vscode.workspace.openTextDocument(openPath).then(doc => {
					vscode.window.showTextDocument(doc);

					// Update the diagnostics now that we done wit the task
					updateDiagnostics(doc, collection);
					console.log("updage diags");
				});
			}

		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
