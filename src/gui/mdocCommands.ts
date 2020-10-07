// this file contains the implementation of most of the mdoc commands, related to the GUI

import * as vscode from 'vscode';
import { DocViewer, Node } from "./docViewer"
import { SourceAdapter } from '../source/sourceAdapter';

export function registerMdocCommands(context:vscode.ExtensionContext, docViewer:DocViewer) {
    context.subscriptions.push(vscode.commands.registerCommand("mdoc.openSourceFromSidebar", async (node: Node) => {
        const docUri = node.docUri
        const source = node.source
        if (docUri && source) 
            openDocumentSource(source, docUri)
    }))

    context.subscriptions.push(vscode.commands.registerCommand("mdoc.openIndexFromSidebar", async (node: Node) => {
        const source = node.source
        if (source) 
            openDocumentSource(source, "index.md")
    }))
}

async function openDocumentSource(source:SourceAdapter, docUri:string) {
    const filePath = source.getDocumentFileLocation(docUri)
    try {
        const textDocument = await vscode.workspace.openTextDocument(filePath)
        vscode.window.showTextDocument(textDocument)
    } catch (err) {
        // probably file does not exist
        vscode.window.showErrorMessage(`Cannot find file '${filePath}'`)
    }
}