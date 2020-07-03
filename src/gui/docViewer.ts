import * as vscode from 'vscode';
import { SourceAdapter, TreeNode as ProjectTreeNode, ProjectTree } from '../source/sourceAdapter';

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
    }

    async addProject(projSource:SourceAdapter) {
        const proj:Project = {
            source: projSource,
            projectTree: await projSource.getProjectTree()
        }
        this.projects.push(proj)
        this.projectProvider?.changed()
    }

    private createViewerPanel() {
        const panel = vscode.window.createWebviewPanel(
            'mDoc',
            'XDoc viewer',
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
            );
            
        panel.webview.html = "...";
    }
}

export const docViewer = new DocViewer();

interface Node { // a node in the project tree sidebar
    parent?: Node
    projectNode:ProjectTreeNode
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
        return new vscode.TreeItem(node.projectNode.label, collapsibleState)
    }

    getChildren(node:Node | undefined) {
        if (node) {
            return node.projectNode.children.map(pnode => ({ projectNode: pnode, parent: node }))
        } else {
            return this.docViewer.projects.map(proj => ({ projectNode: { children: proj.projectTree.children, label: proj.source.title } }))
        }
    }

    changed() {
        this.#onDidChangeTreeData.fire(undefined)
    }
}