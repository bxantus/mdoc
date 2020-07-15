// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitSource } from './source/gitSourceAdapter';
import { URL } from 'url';
import { docViewer } from './gui/docViewer';
import { docProjects } from './source/projects';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	registerCommands(context)
	docViewer.init(context)

	// load and register current projects
	await docProjects.init()
	for (const proj of docProjects.projects.projects) {
		const source = new GitSource(new URL(proj.uri))
		docViewer.addProject(source)	
		context.subscriptions.push(source)
	}

	context.subscriptions.push(docViewer)
}

// this method is called when your extension is deactivated
export function deactivate() {}

function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("mdoc.add.fromFilesystem", async ()=> {
		const result = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: "Select project folder" })
		if (result && result.length == 1) {
			const projectUri = result[0]
			docProjects.addProject({uri: projectUri.toString()})
			const source = new GitSource(new URL(projectUri.toString()))
			docViewer.addProject(source)	
		}
	}))
}
