// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitSource } from './source/gitSourceAdapter';
import { docViewer } from './gui/docViewer';
import { docProjects } from './source/projects';
import { SourceAdapter } from './source/sourceAdapter';

let sources:SourceAdapter[] = []

function disposeSources() {
	for (const source of sources) 
		source.dispose()
	sources = []
}

export function dropSource(source:SourceAdapter) {
	const idx = sources.indexOf(source)
	if (idx >= 0) {
		sources.splice(idx, 1)
		docProjects.removeProject(source.uri)
	}
	source.dispose()
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	registerCommands(context)
	docViewer.init(context)

	// load and register current projects
	await docProjects.init()
	context.subscriptions.push(docProjects)
	for (const proj of docProjects.projects.projects) {
		const source = new GitSource(proj.uri)
		docViewer.addProject(source)	
		sources.push(source)
	}

	docProjects.projectsChanged(projects => {
		disposeSources()
		sources = projects.projects.map(p => new GitSource(p.uri))
		docViewer.refreshProjects(sources)
	})

	context.subscriptions.push(docViewer)
}

// this method is called when your extension is deactivated
export function deactivate() {
	disposeSources()
}

function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("mdoc.add.fromFilesystem", async ()=> {
		const result = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: "Select project folder" })
		if (result && result.length == 1) {
			const projectUri = result[0]
			docProjects.addProject({uri: projectUri.toString()})
			const source = new GitSource(projectUri.toString())
			docViewer.addProject(source)	
		}
	}))

	context.subscriptions.push(vscode.commands.registerCommand("mdoc.add.fromGit", async ()=> {
		vscode.window.showInformationMessage("Adding projects from git repositories not yet supported.\n Please clone the repository and use `Add documentation project from the filesystem` command.")
	}))
}
