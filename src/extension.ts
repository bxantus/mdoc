// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitSource } from './source/gitSourceAdapter';
import { URL } from 'url';
import { docViewer } from './gui/docViewer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	docViewer.init(context)

	// todo: discover registered sources (from settings for ex.), or `<userFolder>/.xdoc/projects.json`
	// until then a hardcoded gitsource is added
	const gitSource = new GitSource(new URL("file:///c:/work/uiengine/uie-docs"))
	
	// register sources to projects view
	docViewer.addProject(gitSource)
}

// this method is called when your extension is deactivated
export function deactivate() {}
