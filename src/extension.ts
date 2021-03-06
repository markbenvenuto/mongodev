// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import * as stream from 'stream';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mongodev" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mongodev.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	const collection = vscode.languages.createDiagnosticCollection('mongodev');

	registerDiagnostics(context, collection);

	registerTaskProviderAndListeners(context, collection);

	registerCodeLensProvider();

	registerCodeLensTasks(context);

	registerDocumentLinkProvider();

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }


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

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): number {
	if (document && path.basename(document.uri.fsPath).match(/(.*.log|log[_A-Za-z0-9]*|log_.*)/)) {
		collection.delete(document.uri);

		const text = document.getText();

		let line_num = 0;
		const lines = text.split("\n");
		let first_line_num: number = -1;
		let diags: Array<vscode.Diagnostic> = [];

		for (const line of lines) {
			for (const em of errorMatchers) {
				const match = line.match(em[0]);
				if (match) {
					if (first_line_num == -1) {
						first_line_num = line_num;
					}
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

		return first_line_num || 0;
	}

	return 0;
}

function registerTaskProviderAndListeners(context: vscode.ExtensionContext, collection: vscode.DiagnosticCollection) {

	let type = "resmokeProvider";
	let testFile = path.join(vscode.workspace.rootPath!, `test1.log`);
	let cwd = vscode.workspace.rootPath;
	// TODO - make python path configurable and warn user if we cannot find on load
	// use getConfiguration.Update();
	// Note: There is no way to get the ${relativeFile} value from the task execution
	// so we hard code the output file
	// TODO - add mrlog integration
	let extensionPath = context.extensionPath;
	let cmd = `python3 ${vscode.workspace.rootPath}/buildscripts/resmoke.py run \$(python3 ${extensionPath}/python/get_test_cmd.py \${relativeFile}) 2>&1 | tee ` + testFile;

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
					return vscode.window.showTextDocument(doc).then(() => {
						// Update the diagnostics now that we done with the task
						let first_line = updateDiagnostics(doc, collection);
						console.log("updage diags");

						// Scroll the hight higlighted - 5 lines
						const scroll_context = 5;
						first_line = first_line > scroll_context ? first_line - scroll_context : first_line;
						return vscode.commands.executeCommand('revealLine', { lineNumber: first_line, at: 'top' });
					});
				});
			}

		}
	});
}

async function superrun(test_executable: string, test_suite: string, test_name: string) {
	// The code you place here will be executed every time your command is executed

	console.log("args - " + test_executable + " -- " + test_suite + " -- " + test_name);

	// await vscode.commands.executeCommand('revealLine', {lineNumber: 10, at: 'top'});

	// Display a message box to the user
	// TODO - warn user about unknown test executable
	//vscode.window.showInformationMessage('Hello World!');
	let execution = new vscode.ShellExecution(
		`echo hi_yeah && ninja ${test_executable} && ${test_executable} --suite ${test_suite} --filter ${test_name}`, {
		//cwd: cwd,
	});

	const task = new vscode.Task(
		{ type: "foo" },
		vscode.TaskScope.Workspace,
		"CodeLens Run",
		"mongodev",
		execution
	);

	task.group = vscode.TaskGroup.Test;
	task.presentationOptions = {
		reveal: vscode.TaskRevealKind.Always,
		panel: vscode.TaskPanelKind.Dedicated,
		clear: true,
	};

	return vscode.tasks.executeTask(task);
}


async function debugUnitTest(test_executable: string, test_suite: string, test_name: string) {
	// The code you place here will be executed every time your command is executed

	console.log("args - " + test_executable + " -- " + test_suite + " -- " + test_name);

	// Display a message box to the user
	// TODO - warn user about unknown test executable
	//vscode.window.showInformationMessage('Hello World!');

	// This is for https://github.com/vadimcn/vscode-lldb, aka vadimcn.vscode-lldb
	const config: vscode.DebugConfiguration = {
		type: "lldb",
		request: "launch",
		name: "Launch unittest",
		program: "${workspaceRoot}/" + test_executable,
		args: ["--suite", test_suite, "--filter", test_name],
		cwd: "${workspaceRoot}",
		initCommands: [
			"command script import ${workspaceRoot}/buildscripts/lldb/lldb_printers.py",
			"command script import ${workspaceRoot}/buildscripts/lldb/lldb_commands.py"
		]
	};

	let folder: vscode.WorkspaceFolder | undefined;
	if (vscode.workspace.workspaceFolders) {
		folder = vscode.workspace.workspaceFolders[0];
	}

	return vscode.debug.startDebugging(folder || undefined, config);
}

function registerCodeLensTasks(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mongodev.superrun', superrun);

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mongodev.debugUnitTest', debugUnitTest);

	context.subscriptions.push(disposable);

}

function registerCodeLensProvider() {

	const codelensProvider = new CodelensProvider();

	vscode.languages.registerCodeLensProvider("cpp", codelensProvider);

	vscode.commands.registerCommand("mongodev.enableCodeLens", () => {
		vscode.workspace.getConfiguration("mongodev").update("enableCodeLens", true, true);
	});

	vscode.commands.registerCommand("mongodev.disableCodeLens", () => {
		vscode.workspace.getConfiguration("mongodev").update("enableCodeLens", false, true);
	});

	vscode.commands.registerCommand("mongodev.codelensAction", (args: any) => {
		vscode.window.showInformationMessage(`CodeLens action clicked with args=${args}`);
	});
}

function loadNinjaCache(): Thenable<Map<String, String>> {
	return new Promise<Map<String, String>>((resolve, reject) => {
		const file_name = '/Users/mark/mongo/build.ninja';
		const parse_ninja = new RegExp(/^build \+([\w\.]+):\s+EXEC\s+([\w\/\\\.]+)/);

		let mapping = new Map<String, String>();
		// create instance of readline
		// each instance is associated with single input stream
		let rl = readline.createInterface({
			input: fs.createReadStream(file_name)
		});

		let line_no = 0;

		// event is emitted after each line
		let line_complete = false;
		let buffered_line = "";
		let need_line = false;
		rl.on('line', function (line) {
			line_no++;
			if (line.startsWith("build +")) {
				// console.log(line);
				buffered_line = line;
				if (line.endsWith("$")) {
					need_line = true;
					line_complete = false;
				} else {
					need_line = false;
					line_complete = true;
				}

			}
			if (need_line) {
				buffered_line += line;
				if (line.endsWith("$")) {
					need_line = true;
				} else {
					need_line = false;
					line_complete = true;
				}

			}
			if (line_complete) {
				line_complete = false;
				buffered_line = buffered_line.replace("$", "");
				let m = parse_ninja.exec(buffered_line);
				if (m != null) {
					let test_name_file = m[1];
					let test_name_exec = m[2];
					// console.log(`${test_name_exec} -- ${test_name_file}`);  
					mapping.set(test_name_file, test_name_exec)
				}
			}
		});

		// end
		rl.on('close', function () {
			// console.log('Total lines : ' + line_no);
			resolve(mapping);
		});
	});
}

/**
 * CodelensProvider
 * 
 * For C++ MongoDB Unit tests.
 * 
 * Looks for TEST.* functions
 */
export class CodelensProvider implements vscode.CodeLensProvider {

	private codeLenses: vscode.CodeLens[] = [];
	private regex: RegExp;
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	private ninja_cache: Map<String, String> = new Map<String, String>();

	constructor() {
		this.regex = /TEST/gm;

		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {

		console.log('mongodev - Providing code lens');

		if (this.ninja_cache.size == 0) {
			console.log("Loading Ninja file");
			this.ninja_cache = await loadNinjaCache();
		}

		if (vscode.workspace.getConfiguration("mongodev").get("enableCodeLens", true)) {
			this.codeLenses = [];
			const regex = new RegExp(this.regex);

			const test_parser = new RegExp(/TEST(_F)?\((?<suite>\w+),\s+(?<name>\w+)/);
			const text = document.getText();
			let matches;
			while ((matches = regex.exec(text)) !== null) {
				const line = document.lineAt(document.positionAt(matches.index).line);

				let testm = test_parser.exec(line.text);
				if (testm == null) {
					console.log('could not parse line for test - ' + line);
					continue;
				}
				let test_suite = testm.groups?.suite || "unknown";
				let test_name = testm.groups?.name || "unknown";
				// console.log('found match - ' + line);


				const indexOf = line.text.indexOf(matches[0]);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
				if (range) {

					const test_executable_key = path.basename(document.fileName, path.extname(document.fileName));
					const test_executable: String = this.ninja_cache.get(test_executable_key) || "unknown_test_executable";

					const runTestCmd = {
						title: "▶\u{fe0e} Run Test",
						tooltip: "Run single unit test",
						command: "mongodev.superrun",
						arguments: [test_executable, test_suite, test_name]
					};
					const debugCmd = {
						title: "Debug",
						tooltip: "Debug single unit test",
						command: "mongodev.debugUnitTest",
						arguments: [test_executable, test_suite, test_name]
					};

					this.codeLenses.push(new vscode.CodeLens(range, runTestCmd)),
						this.codeLenses.push(new vscode.CodeLens(range.with(range.start.with({ character: range.start.character + 1 })), debugCmd));
				}
			}
			return this.codeLenses;
		}
		return [];
	}

	// public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
	//     if (vscode.workspace.getConfiguration("mongodev").get("enableCodeLens", true)) {
	//         codeLens.command = {
	//             title: "▶\u{fe0e} Run Test",
	//             tooltip: "Tooltip provided by sample extension",
	//             command: "mongodev.codelensAction",
	//             arguments: ["Argument 1", false]
	//         };
	//         return codeLens;
	//     }
	//     return null;
	// }
}

/**
 * Provide hyperlinks to files in test results from the mongo shell
 * 
 * Looks for 
 * 
 * foo@a/b/c.js:line:col
 */
class DocumentLinkProvider implements vscode.DocumentLinkProvider {

	//	/@(?<file>[\w\/\\]+\.js):(?<line>\d+):(?<col>\d+)/gm
	// vscode.Uri.file("abc").  .with({ fragment: `${line}${col}` }),
	private regex: RegExp;

	constructor() { 
		this.regex = new RegExp(/@(?<file>[\w\/\\]+\.js):(?<line>\d+):(?<col>\d+)/gm);
	}

	public provideDocumentLinks(document: vscode.TextDocument,
		token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.DocumentLink[]> {
		console.log("provide doc links");
		const result: vscode.DocumentLink[] = [];

		let folder: vscode.WorkspaceFolder | undefined;
		if (vscode.workspace.workspaceFolders) {
			folder = vscode.workspace.workspaceFolders[0];
		}

		let root_dir = folder?.uri.fsPath;

		const text = document.getText();
		let matches;
		while ((matches = this.regex.exec(text)) !== null) {
			const line = document.lineAt(document.positionAt(matches.index).line);

			let file_name = matches.groups?.file || "unknown";
			let line_number = matches.groups?.line || 0;
			let col_number = matches.groups?.col || 0;
			console.log('found match - ' + line);

			const indexOf = line.text.indexOf(matches[0]);
			const position = new vscode.Position(line.lineNumber, indexOf);
			const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
			if (range) {
				result.push(
					new vscode.DocumentLink(
						range,
						vscode.Uri.file(path.join(root_dir || ".", file_name)).with({ fragment: `${line_number}` }),
					)
				);
			}
		}
		return result;
	}

}

function registerDocumentLinkProvider() {
	console.log("Register doc link");
	vscode.languages.registerDocumentLinkProvider({ language: 'mongolog' }, new DocumentLinkProvider());

}
