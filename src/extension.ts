// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseNinjaFile } from './ninja_parser';

// CONFIGURATION STRINGS
//
const CONFIG_MRLOG = "programs.mrlog";
const CONFIG_NINJA = "programs.ninja";
const CONFIG_NINJA_FILE = "ninjaFile";
const CONFIG_DEBUG_ENGINE = "debugEngine";
const CONFIG_ENABLE_CODELENS = "enableCodeLens";
const CONFIG_PYTHON3 = "programs.python3";
const CONFIG_TEST_SCROLLBACK = "testScrollback";

let mongodbRoot = "";
let extensionContext: vscode.ExtensionContext;

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
	context.subscriptions.push(disposable);

	mongodbRoot = findMongoDBRoot();
	extensionContext = context;

	const collection = vscode.languages.createDiagnosticCollection('mongodev');

	registerDiagnostics(collection);

	registerTaskProviderAndListeners(collection);

	registerCodeLensProvider();

	registerCodeLensTasks();

	registerDocumentLinkProvider();

	registerDebugHelpers();

	checkForMissingFiles();
	// TODO - consider setTimeout() from nodejs?
}

// this method is called when your extension is deactivated
export function deactivate() { }


function mlog(msg: string) {
	console.log("mongodev: " + msg);
}


function registerDiagnostics(collection: vscode.DiagnosticCollection) {
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor.document, collection);
	}

	extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDiagnostics(editor.document, collection);
		}
	}));

}

// Tuples of RegEx to search for and message to display for user
const errorMatchers: Array<[RegExp, string]> = [
	[/BACKTRACE/, "Assertion"],
	[/BadValue:.*/, "BadValue error"],
	[/failed to load:.*/, "failed to load file"],
	[/uncaught exception:.*/, "Uncaught Javascript exception"],
	[/assert failed.*/, "JS Assert failed"],
	[/assert.*are not equal/, "JS Equality Assert failed"],
	[/mongo program was not running at.*/, "Mongo Program had bad exit"],
	[/Invalid access.*/, "Mongo Program crashed"],
	[/Got signal.*/, "Mongo Program got fatal signal"],
	[/Got signal.*/, "Mongo Program got fatal signal"],
	[/ERROR: AddressSanitizer.*/, "Address Sanitizer failure"],
];

/**
 * Scan a log file for "errors" to highlight
 *
 * @param document
 * @param collection
 * @returns the line number with the first error
 */
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
					if (first_line_num === -1) {
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

function getPythonScriptsDir() {
	const extensionPath = extensionContext.extensionPath;

	return path.join(extensionPath, "python");
}

function wrapWithMrlog(cmd: string, args: string) {
	const mrlog = vscode.workspace.getConfiguration("mongodev").get(CONFIG_MRLOG);

	return `${mrlog} -e ${cmd} -- ${args}`;
}


function wrapWithMrlogFile(cmd: string, args: string, testFile: string) {
	const mrlog = vscode.workspace.getConfiguration("mongodev").get(CONFIG_MRLOG);

	return `${mrlog} -t -o ${testFile} -e ${cmd} -- ${args}`;
}

function wrapWithActivate(cmdWithArgs: string) {
	const python_scripts_dir = getPythonScriptsDir();

	return `/bin/sh ${python_scripts_dir}/run_virtualenv.sh ${cmdWithArgs}`;
}


function findMongoDBRootWorkspace() {
	let mongodbRoot: vscode.WorkspaceFolder | undefined = undefined;

	//mlog(`Checking for scons files in workspace folders`);
	if (vscode.workspace.workspaceFolders !== undefined) {
		for (let folder of vscode.workspace.workspaceFolders) {
			const sconsFile = path.join(folder.uri.fsPath, "SConstruct");
			// mlog(`Checking for scons file ${sconsFile}`)
			if (fs.existsSync(sconsFile)) {
				mongodbRoot = folder;
			}
		}
	}

	return mongodbRoot;
}

function findMongoDBRoot() {
	const mongodbRoot = findMongoDBRootWorkspace();

	return mongodbRoot ? mongodbRoot.uri.fsPath : "";
}


const TASK_RESMOKE = "Resmoke";
const TASK_CLANG_FORMAT = "MyClangFormat";
const TASK_COMPILE_COMMANDS = "Compile_Commands.json";
const TASK_GENERATE_FEATURE_FLAGS = "Generate All Feature Flag File";
const TASK_CHECK_ERRORCODES = "Check duplicate errorcodes";
const TASK_SUPER_RUN = "Super Run";
const TASK_INSTALL_PIP = "Install Pip";
const TASK_GENERATE_DEBUG_BUILD_NINJA = "Generate Debug Build.ninja";

function getCommandForTask(taskName: string) {
	let cwd = mongodbRoot;
	const python_scripts_dir = getPythonScriptsDir();

	const python3 = vscode.workspace.getConfiguration("mongodev").get(CONFIG_PYTHON3) as string;


	switch (taskName) {
		case TASK_RESMOKE: {
			// TODO - add support for virtual env?
			// use getConfiguration.Update();
			// Note: There is no way to get the ${relativeFile} value from the task execution
			// so we hard code the output file
			// let cmd = `${python3} ${vscode.workspace.rootPath}/buildscripts/resmoke.py run \$(${python3} ${extensionPath}/python/get_test_cmd.py \${relativeFile}) 2>&1 | tee ` + testFile;
			// let cmd = wrapWithMrlogFile(python3, `${vscode.workspace.rootPath}/buildscripts/resmoke.py run \$(${python3} ${extensionPath}/python/get_test_cmd.py \${relativeFile})  --mongodSetParameters="{featureFlagTenantMigrations: true,featureFlagAuthorizationContract: true}" `, testFile);
			const testFile = path.join(mongodbRoot, `test1.log`);

			const cmd = wrapWithMrlogFile("/bin/sh", `${python_scripts_dir}/run_virtualenv.sh ${python_scripts_dir}/run_resmoke.sh ${python3} ${mongodbRoot}/buildscripts/resmoke.py \${file}`, testFile);

			return new vscode.ShellExecution(cmd, {
				cwd: cwd,
			});
		}

		case TASK_CLANG_FORMAT: {
			return new vscode.ShellExecution(
				`${python3} ${mongodbRoot}/buildscripts/clang_format.py format-my`, { cwd: cwd });
		}

		case TASK_COMPILE_COMMANDS: {
			return new vscode.ShellExecution(wrapWithActivate(
				`${python3} ${mongodbRoot}/buildscripts/scons.py --variables-files=etc/scons/mongodbtoolchain_stable_clang.vars compiledb generated-sources`), { cwd: cwd });
		}

		case TASK_GENERATE_FEATURE_FLAGS: {
			return new vscode.ShellExecution(wrapWithActivate(
				`${python3} ${mongodbRoot}/buildscripts/idl/gen_all_feature_flag_list.py --import-dir src --import-dir src/mongo/db/modules/enterprise/src`), { cwd: cwd });
		}

		case TASK_CHECK_ERRORCODES: {
			return new vscode.ShellExecution(wrapWithActivate(
				`${python3} ${mongodbRoot}/buildscripts/errorcodes.py`), { cwd: cwd });
		}

		case TASK_SUPER_RUN: {
			const mrlog = vscode.workspace.getConfiguration("mongodev").get(CONFIG_MRLOG);
			const ninjaFile = vscode.workspace.getConfiguration("mongodev").get(CONFIG_NINJA_FILE);

			return new vscode.ShellExecution(wrapWithActivate(
				`${python_scripts_dir}/super_run.sh ${mrlog} ${ninjaFile} ` + "${relativeFile}"), { cwd: cwd });
		}

		case TASK_INSTALL_PIP: {
			return new vscode.ShellExecution(wrapWithActivate(
				`${python3} -m pip install -r buildscripts//requirements.txt`), { cwd: cwd });
		}

		case TASK_GENERATE_DEBUG_BUILD_NINJA: {
			return new vscode.ShellExecution(wrapWithActivate(
				`${python3} ${mongodbRoot}/buildscripts/scons.py --variables-files=etc/scons/mongodbtoolchain_stable_clang.vars  --link-model=object --dbg=on --ninja --modules=enterprise --enable-free-mon=off ICECC=icecc CCACHE=ccache`), { cwd: cwd });
		}

		default: {
			mlog(`Failed to find command: '${taskName}'`);
		}
	}
}

/**
 * IMongoTaskDefinition exists so that all the tasks we generate have unique _ids. If they are not unique, re-running recently run tasks will have undefined behavior.
 *
 * The _id for a task is generated based on "extension id, task.type, required definition properties"
 *
 * See https://github.com/microsoft/vscode/blob/e0a65a97d4f349cf11a7cae804a5553ccb412528/src/vs/workbench/contrib/tasks/common/tasks.ts#L1219
 */
export interface IMongoTaskDefinition extends vscode.TaskDefinition {
	script: string;
}

function registerTaskProviderAndListeners(collection: vscode.DiagnosticCollection) {

	const type = "mongodev";

	vscode.tasks.registerTaskProvider(type, {
		provideTasks(token?: vscode.CancellationToken): vscode.Task[] {
			let resmokeTask =
				new vscode.Task({ type: type, script: "resmoke1" }, vscode.TaskScope.Workspace,
					TASK_RESMOKE, "mongodev", getCommandForTask(TASK_RESMOKE));

			resmokeTask.group = vscode.TaskGroup.Test;
			resmokeTask.runOptions.reevaluateOnRerun = true;
			resmokeTask.presentationOptions.clear = true;

			let clangFormatTask =
				new vscode.Task({ type: type, script: "clangformat1" }, vscode.TaskScope.Workspace,
					TASK_CLANG_FORMAT, "mongodev", getCommandForTask(TASK_CLANG_FORMAT));

			clangFormatTask.group = vscode.TaskGroup.Build;
			clangFormatTask.runOptions.reevaluateOnRerun = true;
			clangFormatTask.presentationOptions.clear = true;

			let compileDBTask =
				new vscode.Task({ type: type, script: "compiledb1" }, vscode.TaskScope.Workspace,
					TASK_COMPILE_COMMANDS, "mongodev",
					getCommandForTask(TASK_COMPILE_COMMANDS));

			compileDBTask.group = vscode.TaskGroup.Build;
			compileDBTask.runOptions.reevaluateOnRerun = true;
			compileDBTask.presentationOptions.clear = true;

			let featureFlagTask =
				new vscode.Task({ type: type, script: "featureflag1" }, vscode.TaskScope.Workspace,
					TASK_GENERATE_FEATURE_FLAGS, "mongodev", getCommandForTask(TASK_GENERATE_FEATURE_FLAGS));

			featureFlagTask.group = vscode.TaskGroup.Build;
			featureFlagTask.runOptions.reevaluateOnRerun = true;
			featureFlagTask.presentationOptions.clear = true;

			let checkErrorCodesTask =
				new vscode.Task({ type: type, script: "errorcodes1" }, vscode.TaskScope.Workspace,
					TASK_CHECK_ERRORCODES, "mongodev", getCommandForTask(TASK_CHECK_ERRORCODES));

			checkErrorCodesTask.group = vscode.TaskGroup.Build;
			checkErrorCodesTask.runOptions.reevaluateOnRerun = true;
			checkErrorCodesTask.presentationOptions.clear = true;
			// checkErrorCodesTask.problemMatchers = ["$mongodev_errorcodes"];
			// TODO - make error codes output in a format vscode can consume

			let superRunTask =
				new vscode.Task({ type: type, script: "superrun1" }, vscode.TaskScope.Workspace,
					TASK_SUPER_RUN, "mongodev", getCommandForTask(TASK_SUPER_RUN));
			superRunTask.group = vscode.TaskGroup.Build;
			superRunTask.runOptions.reevaluateOnRerun = true;
			superRunTask.presentationOptions.clear = true;
			superRunTask.problemMatchers = ["$mongodev_msvc", "$mongodev_msvc2", "$mongodev_gcc", "$mongodev_unittest"];


			let installPipTask =
				new vscode.Task({ type: type, script: "pip1" }, vscode.TaskScope.Workspace,
				TASK_INSTALL_PIP, "mongodev", getCommandForTask(TASK_INSTALL_PIP));
			installPipTask.group = vscode.TaskGroup.Build;
			installPipTask.runOptions.reevaluateOnRerun = true;
			installPipTask.presentationOptions.clear = true;


			let generateNinjaTask =
				new vscode.Task({ type: type, script: "debugNinja1" }, vscode.TaskScope.Workspace,
				TASK_GENERATE_DEBUG_BUILD_NINJA, "mongodev", getCommandForTask(TASK_GENERATE_DEBUG_BUILD_NINJA));
			generateNinjaTask.group = vscode.TaskGroup.Build;
			generateNinjaTask.runOptions.reevaluateOnRerun = true;
			generateNinjaTask.presentationOptions.clear = true;

			return [resmokeTask, clangFormatTask, compileDBTask, featureFlagTask, checkErrorCodesTask, superRunTask, installPipTask, generateNinjaTask];
		},
		resolveTask(_task: vscode.Task, token?: vscode.CancellationToken): vscode.Task {
			mlog("Resolving Task: " + _task.name);
			// When a user selects a task, it is fully filled out
			// When a user re-runs the last task, then the execution is not set and has to be set
			// See https://github.com/microsoft/vscode/blob/8feb40b9284c339e2d1b0a493641e603b7f84d3d/src/vs/workbench/contrib/tasks/browser/abstractTaskService.ts#L749
			// console.log(_task);

			let taskName = _task.name;
			// Trim the "mongodev:  prefix that vscode adds when rerunning a recent task
			taskName = taskName.replace("mongodev: ", "");

			_task.execution = getCommandForTask(taskName);
			// console.log(_task);

			return _task;
		}
	});

	const testFile = path.join(mongodbRoot, `test1.log`);

	vscode.tasks.onDidStartTaskProcess((a) => {
		if (a.execution.task.name.indexOf(TASK_RESMOKE) >= 0) {
			// Clear the diagnostics for the test log file
			// since vs code will show an empty file once the tests start running
			// so an empty file cannot have errors.
			collection.delete(vscode.Uri.file(testFile));
		}
	});

	// Hook onDidEndTask so we can open the test file in a window
	vscode.tasks.onDidEndTask((a) => {
		mlog('onDidEndTask ' + a.execution.task.name);

		// Note:
		// task name can be
		// "Resmoke"
		// "mongodev: Resmoke"
		// depend on how the task is run
		if (a.execution.task.name.indexOf(TASK_RESMOKE) >= 0) {
			let e = a.execution.task.execution;
			if (e !== undefined) {
				//mlog('onDidStartTaskProcess ' + e!.commandLine);

				var openPath = vscode.Uri.file(testFile);
				vscode.workspace.openTextDocument(openPath).then(doc => {
					return vscode.window.showTextDocument(doc).then(() => {
						// Update the diagnostics now that we done with the task
						let first_line = updateDiagnostics(doc, collection);
						mlog("update diagnostics for mongodb test log file: " + testFile);

						// Scroll the hight highlighted - 5 lines
						const scroll_context = vscode.workspace.getConfiguration("mongodev").get(CONFIG_TEST_SCROLLBACK) as number;
						first_line = first_line > scroll_context ? first_line - scroll_context : first_line;
						return vscode.commands.executeCommand('revealLine', { lineNumber: first_line, at: 'top' });
					});
				});
			}

		}
	});
}

async function runUnitTest(test_executable: string, test_suite: string, test_name: string) {
	// The code you place here will be executed every time your command is executed

	mlog("args - " + test_executable + " -- " + test_suite + " -- " + test_name);

	// await vscode.commands.executeCommand('revealLine', {lineNumber: 10, at: 'top'});

	// Display a message box to the user
	// TODO - warn user about unknown test executable
	//vscode.window.showInformationMessage('Hello World!');
	let ninja = vscode.workspace.getConfiguration("mongodev").get(CONFIG_NINJA);
	let ninjaFile = vscode.workspace.getConfiguration("mongodev").get(CONFIG_NINJA_FILE);
	let execution = new vscode.ShellExecution(
		`echo Running Unit Test && ${ninja} -f ${ninjaFile} ${test_executable} && ${test_executable} --suite ${test_suite} --filter ${test_name}`, {
		//cwd: cwd,
	});

	const task = new vscode.Task(
		{ type: "mongodev" },
		vscode.TaskScope.Workspace,
		"MongoDB Unit Test",
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

	mlog("debug args - " + test_executable + " -- " + test_suite + " -- " + test_name);

	// Find a debugger to use
	let debugEngine = vscode.workspace.getConfiguration("mongodev").get(CONFIG_DEBUG_ENGINE);
	if (debugEngine === "auto") {
		if (vscode.extensions.getExtension("llvm.lldb-vscode")) {
			debugEngine = "llvm.lldb-vscode";
		} else {
			if (!vscode.extensions.getExtension("vadimcn.vscode-lldb")) {
				vscode.window.showInformationMessage("mongodev: Could not find debugger extension 'vadimcn.vscode-lldb'. Install 'vadimcn.vscode-lldb' to support debugging unittests");
				return;
			}
			debugEngine = "vadimcn.vscode-lldb";
		}
	}

	// This is for https://github.com/vadimcn/vscode-lldb, aka vadimcn.vscode-lldb
	let config: vscode.DebugConfiguration = {
		type: "lldb",
		request: "launch",
		name: "Launch unittest",
		program: path.join(mongodbRoot, test_executable),
		args: ["--suite", test_suite, "--filter", test_name],
		cwd: mongodbRoot,
		initCommands: [
			`command script import ${mongodbRoot}/buildscripts/lldb/lldb_printers.py`,
			`command script import ${mongodbRoot}/buildscripts/lldb/lldb_commands.py`
		]
	};

	// This is for https://github.com/llvm/llvm-project/tree/main/lldb/tools/lldb-vscode, aka llvm.lldb-vscode
	if (debugEngine === "llvm.lldb-vscode") {
		config = {
			type: "lldb-vscode",
			request: "launch",
			name: "Launch unittest",
			program: path.join(mongodbRoot, test_executable),
			args: ["--suite", test_suite, "--filter", test_name],
			cwd: mongodbRoot,
			initCommands: [
				`command script import ${mongodbRoot}/buildscripts/lldb/lldb_printers.py`,
				`command script import ${mongodbRoot}/buildscripts/lldb/lldb_commands.py`
			]
		};
	}

	return vscode.debug.startDebugging(findMongoDBRootWorkspace(), config);
}

function registerCodeLensTasks() {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mongodev.runUnitTest', runUnitTest);

	extensionContext.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mongodev.debugUnitTest', debugUnitTest);

	extensionContext.subscriptions.push(disposable);

}

function registerCodeLensProvider() {

	mlog("Registering Code Lens");
	const codelensProvider = new CodelensProvider();

	vscode.languages.registerCodeLensProvider("cpp", codelensProvider);

	vscode.commands.registerCommand("mongodev.enableCodeLens", () => {
		vscode.workspace.getConfiguration("mongodev").update(CONFIG_ENABLE_CODELENS, true, true);
	});

	vscode.commands.registerCommand("mongodev.disableCodeLens", () => {
		vscode.workspace.getConfiguration("mongodev").update(CONFIG_ENABLE_CODELENS, false, true);
	});

	vscode.commands.registerCommand("mongodev.codelensAction", (args: any) => {
		vscode.window.showInformationMessage(`CodeLens action clicked with args=${args}`);
	});
}

function loadNinjaCache(): Thenable<Map<string, string>> {
	let ninjaFile = vscode.workspace.getConfiguration("mongodev").get("ninjaFile") as string;
	if (!path.isAbsolute(ninjaFile)) {

		let folder: vscode.WorkspaceFolder | undefined;
		if (vscode.workspace.workspaceFolders) {
			folder = vscode.workspace.workspaceFolders[0];

			// TODO - debug if this makes a proper full path
			ninjaFile = path.join(folder.name, ninjaFile);
		}
	}

	// TODO - test for file exists and warn user
	mlog("Loading Ninja file: " + ninjaFile);

	return parseNinjaFile(ninjaFile);
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
		this.regex = /^TEST/gm;

		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {

		mlog('Providing code lens');

		if (this.ninja_cache.size === 0) {
			this.ninja_cache = await loadNinjaCache();
		}

		if (vscode.workspace.getConfiguration("mongodev").get(CONFIG_ENABLE_CODELENS, true)) {
			this.codeLenses = [];
			const regex = new RegExp(this.regex);

			const test_parser = new RegExp(/TEST(_F)?\((?<suite>\w+),\s+(?<name>\w+)/g);
			const text = document.getText();
			let matches;
			while ((matches = regex.exec(text)) !== null) {
				const line_num = document.positionAt(matches.index).line;
				const line = document.lineAt(line_num);

				// mlog("last " + regex.lastIndex +  " --" + matches.index);
				test_parser.lastIndex = matches.index;
				let test_match = test_parser.exec(text);
				if (test_match === null) {
					mlog(`could not parse line for test - ${line_num}` + line.text);
					continue;
				}
				let test_suite = test_match.groups?.suite || "unknown";
				let test_name = test_match.groups?.name || "unknown";
				// mlog(`found match - ${test_suite} -- ${test_name}`);

				const indexOf = line.text.indexOf(matches[0]);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
				if (range) {
					const test_executable_key = path.basename(document.fileName, path.extname(document.fileName));
					const test_executable: String = this.ninja_cache.get(test_executable_key) || "unknown_test_executable";
					if (test_executable === "unknown_test_executable") {
						mlog(`Could not find test executable: ${this.ninja_cache.size} -- ${test_executable_key}`);
					}

					const runTestCmd = {
						title: "▶\u{fe0e} Run Test",
						tooltip: "Run single unit test",
						command: "mongodev.runUnitTest",
						arguments: [test_executable, test_suite, test_name]
					};
					const debugCmd = {
						title: "Debug",
						tooltip: "Debug single unit test",
						command: "mongodev.debugUnitTest",
						arguments: [test_executable, test_suite, test_name]
					};

					this.codeLenses.push(new vscode.CodeLens(range, runTestCmd));
					this.codeLenses.push(new vscode.CodeLens(range.with(range.start.with({ character: range.start.character + 1 })), debugCmd));
				}
			}
			return this.codeLenses;
		}
		return [];
	}

	// public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
	//     if (vscode.workspace.getConfiguration("mongodev").get(CONFIG_ENABLE_CODELENS, true)) {
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
		this.regex = new RegExp(/@(?<file>[\w\/\\-]+\.js):(?<line>\d+):(?<col>\d+)/gm);
	}

	public provideDocumentLinks(document: vscode.TextDocument,
		token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.DocumentLink[]> {
		mlog("provide doc links");
		const result: vscode.DocumentLink[] = [];

		let root_dir = mongodbRoot;

		const text = document.getText();
		let matches;
		while ((matches = this.regex.exec(text)) !== null) {
			const line = document.lineAt(document.positionAt(matches.index).line);

			let file_name = matches.groups?.file || "unknown";
			let line_number = matches.groups?.line || 0;
			let col_number = matches.groups?.col || 0;
			// mlog(`found match - ${line_number} - ${col_number}`);

			const indexOf = line.text.indexOf(matches[0]);
			const position = new vscode.Position(line.lineNumber, indexOf);
			const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
			if (range) {
				let full_file_path = path.join(root_dir || ".", file_name);
				if (file_name.startsWith('/')) {
					full_file_path = file_name;
				}

				result.push(
					new vscode.DocumentLink(
						range,
						vscode.Uri.file(full_file_path).with({ fragment: `${line_number}:${col_number}` }),
					)
				);
			}
		}
		return result;
	}

}

function registerDocumentLinkProvider() {
	vscode.languages.registerDocumentLinkProvider({ language: 'mongolog' }, new DocumentLinkProvider());

}

/**
 * Shows a pick list using window.showQuickPick().
 */
export async function pickMongoProcess() {
	//let i = 0;
	const result = await vscode.window.showQuickPick(['eins', 'zwei', 'drei'], {
		placeHolder: 'eins, zwei or drei',
		//onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
	});
	vscode.window.showInformationMessage(`Got: ${result}`);

	// Commands are expected to return strings
	return "3279435";
}


function registerDebugHelpers() {
	let disposable2 = vscode.commands.registerCommand('mongodev.pickMongoProcess', pickMongoProcess);
	extensionContext.subscriptions.push(disposable2);
}


// TODO - see https://github.com/microsoft/vscode/blob/3a8b1fe03ebbcf57fb9c50b161db91229e2fe04a/extensions/typescript-language-features/src/utils/largeProjectStatus.ts#L42
// for how to create a button
//
function checkForMissingFiles() {

	const compileCommands = path.join(mongodbRoot, `compile_commands.json`);

	if(!fs.existsSync(compileCommands)) {
		vscode.window.showWarningMessage("Could not find 'compile_commands.json' file. Generate one with 'Run Task'")
	}

	// TODO - add more warnings?
}
