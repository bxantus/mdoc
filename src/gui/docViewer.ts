import * as vscode from 'vscode';
import { SourceAdapter, TreeNode as ProjectTreeNode, ProjectTree } from '../source/sourceAdapter';
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor"
import { Document } from '../source/document';

interface Project {
    source: SourceAdapter
    projectTree:  ProjectTree
}

class DocViewer {
    projects:Project[] = []
    projectProvider:ProjectTreeProvider|undefined
    projectTree:vscode.TreeView<Node>|undefined
    
    constructor() {
    }
    
    init(context:vscode.ExtensionContext) {
        this.projectProvider = new ProjectTreeProvider(this)
        this.projectTree = vscode.window.createTreeView<Node>("xdocProjects", {treeDataProvider: this.projectProvider})

        context.subscriptions.push(vscode.commands.registerCommand("xdoc.openFromSidebar", async (node: Node) => {
            const docUri = node.projectNode.docUri
            if (docUri) {
                const source = getSourceForNode(node)
                const document = await source?.getDocument(docUri)
                if (document) 
                    this.loadDocumentInViewer(document, node.projectNode.label)    
            }
        }))
    }

    async addProject(projSource:SourceAdapter) {
        const proj:Project = {
            source: projSource,
            projectTree: await projSource.getProjectTree()
        }
        this.projects.push(proj)
        this.projectProvider?.changed()
    }

    get viewerPanel() {
        if (this.#viewerPanel)
            return this.#viewerPanel
        else {
            this.#viewerPanel = this.createViewerPanel()
            return this.#viewerPanel
        }
    }

    loadDocumentInViewer(document:Document, title) {
        const md = new MarkdownIt()
        // todo: should add/inject to the generated html:
        //    - link to stylesheet styling font size and other aspects
        //    - link to highlight.js (or similar source hiliter lib)
        //    - import of extra functionality from `www/viewer.js` (communication, opening links etc.)

        // internal links do not work by default, markdownItAnchor adds ids to the headings in the document, and they will work out of the box
        // NOTE: should use a slugify function which preserves camelCase (or use toc generator which generates the same internal links!)
        md.use(markdownItAnchor, {level: 1})
        this.viewerPanel.webview.html = md.render(document.markdownContent.toString(), {})
        this.viewerPanel.title = title
        this.viewerPanel.reveal()
    }

    #viewerPanel:vscode.WebviewPanel | undefined
    private createViewerPanel() {
        return vscode.window.createWebviewPanel(
            'mDoc',
            'XDoc viewer',
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
        );       
    }
}

export const docViewer = new DocViewer();

interface Node { // a node in the project tree sidebar
    parent?: Node
    projectNode:ProjectTreeNode
    source?:SourceAdapter
}

function getSourceForNode(node:Node) {
    let n:Node|undefined = node
    for (;n; n = n.parent) {
        if (n.source) return n.source
    }
}

class ProjectTreeProvider implements vscode.TreeDataProvider<Node> {
    #onDidChangeTreeData = new vscode.EventEmitter<Node|undefined>()
    get onDidChangeTreeData() { return this.#onDidChangeTreeData.event }

    constructor(private docViewer:DocViewer) {

    }
    
    private getNodeDepth(node:Node) {
        let depth = 1
        for (;node.parent; node = node.parent)
            ++depth
        return depth
    }

    getTreeItem(node:Node) {
        // items on the first two levels will be open, otherwise collapsed
        const depth = this.getNodeDepth(node)
        let collapsibleState = vscode.TreeItemCollapsibleState.None
        if (node.projectNode.children.length > 0) {
            collapsibleState = depth <= 2 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        } else if (!node.parent) collapsibleState = vscode.TreeItemCollapsibleState.Expanded // root project node
        const item = new vscode.TreeItem(node.projectNode.label, collapsibleState)
        item.command = {
            command: "xdoc.openFromSidebar",
            title: "Open document",
            arguments: [node]
        }
        return item
    }

    getChildren(node:Node | undefined) {
        if (node) {
            return node.projectNode.children.map(pnode => ({ projectNode: pnode, parent: node }))
        } else {
            return this.docViewer.projects.map(proj => ({ projectNode: { children: proj.projectTree.children, label: proj.source.title }, source:proj.source  }))
        }
    }

    changed() {
        this.#onDidChangeTreeData.fire(undefined)
    }
}