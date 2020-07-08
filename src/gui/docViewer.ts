import * as vscode from 'vscode';
import { SourceAdapter, TreeNode as ProjectTreeNode, ProjectTree } from '../source/sourceAdapter';
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor"
import hljs from 'highlight.js'
import { Document } from '../source/document';
import * as path from 'path';
import slugify from '../util/slugify'

interface Project {
    source: SourceAdapter
    projectTree:  ProjectTree
}

class DocViewer implements vscode.Disposable {
    projects:Project[] = []
    projectProvider:ProjectTreeProvider|undefined
    projectTree:vscode.TreeView<Node>|undefined
    #subs:vscode.Disposable[] = []
    #extensionPath = ""
    
    constructor() {
    }

    dispose() {
        for (const sub of this.#subs)
            sub.dispose()
        if (this.#documentWatch)
            this.#documentWatch.dispose()
    }
    
    init(context:vscode.ExtensionContext) {
        this.#extensionPath = context.extensionPath
        this.projectProvider = new ProjectTreeProvider(this)
        this.projectTree = vscode.window.createTreeView<Node>("xdocProjects", {treeDataProvider: this.projectProvider})

        context.subscriptions.push(vscode.commands.registerCommand("xdoc.openFromSidebar", async (node: Node) => {
            const docUri = node.projectNode.docUri
            const source = getSourceForNode(node)
            if (docUri && source) {
                this.openDocument(source, docUri, node.projectNode.label)
            }
        }))
    }

    #documentWatch:vscode.Disposable|undefined
    private async openDocument(source:SourceAdapter, docUri:string, title:string) {
        const document = await source.getDocument(docUri)
        if (document) {
            this.loadDocumentInViewer(document, title, {scrollToTop: true}) 
            this.#documentWatch?.dispose() // dispose old watch
            this.#documentWatch = source.watchDocument(docUri, async ()=> {
                const newDoc = await source.getDocument(docUri)
                if (newDoc)
                    this.loadDocumentInViewer(newDoc, title, {scrollToTop: false}) 
            })
        }
        
    }

    async addProject(projSource:SourceAdapter) {
        const proj:Project = {
            source: projSource,
            projectTree: await projSource.getProjectTree()
        }
        this.projects.push(proj)
        this.projectProvider?.changed()
        // todo: remove subscription, when project changes
        this.#subs.push(proj.source.onProjectTreeChanged((newTree)=> {
            proj.projectTree = newTree
            this.projectProvider?.changed() // todo: this may be a finer grained change, if projectProvider caches tree nodes
        }))
    }

    private get viewerPanel() {
        if (this.#viewerPanel)
            return this.#viewerPanel
        else {
            this.#viewerPanel = this.createViewerPanel()
            return this.#viewerPanel
        }
    }

    private loadDocumentInViewer(document:Document, title:string, options:{ scrollToTop:boolean }) {
        const md = new MarkdownIt({
            highlight(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str, /* ignoreIllegals: */ true).value;
                    } catch (__) {}
                }
            
                return ''; // use external default escaping
            },
            linkify: true
        })
        
        // internal links do not work by default, markdownItAnchor adds ids to the headings in the document, and they will work out of the box
        // NOTE: it uses the same slugify function as the toc generator, so they generate the same internal links!
        //       if no toc will be generated for some headers, slugify should be called for them as well, otherwise duplicates won't be handled the same
        const asWebviewUri = (path:string) => this.viewerPanel.webview.asWebviewUri(vscode.Uri.file(path))
        
        const markdownCss = asWebviewUri(path.join(this.#extensionPath, "www", "markdown.css"))
        const hiliteCss = asWebviewUri(path.join(this.#extensionPath, "www", "highlight.css"))
        const viewerCss = asWebviewUri(path.join(this.#extensionPath, "www", "viewer.css"))
        const viewerJs = asWebviewUri(path.join(this.#extensionPath, "www", "viewer.js"))
        
        let slugs = new Map<string, number>()
        md.use(markdownItAnchor, {level: 1, slugify: (s:string) => slugify(s, slugs)})
        const markdownContent = md.render(document.markdownContent.toString())

        const htmlContent = 
            `
            <head>
                <link rel="stylesheet" type="text/css" href="${markdownCss}">
                <link rel="stylesheet" type="text/css" href="${hiliteCss}">
                <link rel="stylesheet" type="text/css" href="${viewerCss}">
                <script src="${viewerJs}"></script>
            </head>
            <body>
                <div id="__markdown-content">
                    ${markdownContent}
                </div>
                <div id="__side">
                    <div class="uppercase">In this document</div>
                    ${this.generateTocHtml(document)}
                </div>
            </body>
            `
        
        this.viewerPanel.webview.html = htmlContent
        this.viewerPanel.title = title
        this.viewerPanel.reveal()
        if (options.scrollToTop)
            this.viewerPanel.webview.postMessage({command:"scrollToTop"})
    }

    private generateTocHtml(document:Document) {
        const headings = document.getHeadings()
        let html = "<ul>\n"
        let headingLevel = 1
        let slugs = new Map<string, number>()
        for (const h of headings) {
            if (h.level > headingLevel) {
                // open new list inside
                html += "<li>\n<ul>\n".repeat(h.level - headingLevel)
            } else if (h.level < headingLevel) { // close lists
                html += "</ul>\n</li>\n".repeat(headingLevel - h.level)
            }
            html += `<li><a title="${h.title}" href="#${slugify(h.title, slugs)}">${h.title}</a></li>\n`
            headingLevel = h.level
        }
        // close remaining headings
        if (headingLevel > 1)
            html += "</ul>\n</li>\n".repeat(headingLevel - 1)
        html += "</ul>\n" // close outer heading
        
        return html
    }

    #viewerPanel:vscode.WebviewPanel | undefined
    private createViewerPanel() {
        const panel = vscode.window.createWebviewPanel(
            'mDoc',
            'XDoc viewer',
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
        );       
        panel.iconPath = {
            light: vscode.Uri.file(path.join(this.#extensionPath, "media/library_books-light.svg")),
            dark: vscode.Uri.file(path.join(this.#extensionPath, "media/library_books-dark.svg")),
        }
        panel.onDidDispose(()=> {
            this.#viewerPanel = undefined // remove the cached panel, a new one will open next time
        })
        return panel
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
            return this.docViewer.projects.map(proj => ({ projectNode: { children: proj.projectTree.children, label: proj.source.title, docUri: 'README.md'  }, source:proj.source  }))
        }
    }

    changed() {
        this.#onDidChangeTreeData.fire(undefined)
    }
}