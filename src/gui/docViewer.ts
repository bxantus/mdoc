import * as vscode from 'vscode';
import { SourceAdapter, ProjectTree, TreeNode, getDocument } from '../source/sourceAdapter';
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor"
import hljs from 'highlight.js'
import { Document } from '../source/document';
import * as path from 'path';
import slugify from '../util/slugify'
import dispose from '../util/dispose';
import { DocSearch } from '../search/docSearch';

interface Project {
    source: SourceAdapter
    projectTree:  ProjectTree
    docSearch:DocSearch
    searchState: { query:string }
    subs: vscode.Disposable[]
    loading?:boolean
}

class DocViewer implements vscode.Disposable {
    projects:Project[] = []
    projectProvider:ProjectTreeProvider|undefined
    projectTree:vscode.TreeView<Node>|undefined
    #extensionPath = ""
    
    constructor() {
    }

    dispose() {
        dispose(...this.projects.map(proj => proj.subs))
        dispose(this.#documentWatch)
        this.#current = undefined
    }
    
    init(context:vscode.ExtensionContext) {
        this.#extensionPath = context.extensionPath
        this.projectProvider = new ProjectTreeProvider(this)
        this.projectTree = vscode.window.createTreeView<Node>("xdocProjects", {treeDataProvider: this.projectProvider})

        context.subscriptions.push(vscode.commands.registerCommand("xdoc.openFromSidebar", async (node: Node) => {
            const docUri = node.docUri
            const source = node.source
            if (docUri && source) {
                this.openDocument(source, docUri, node.label)
            }
        }))
        context.subscriptions.push(vscode.commands.registerCommand("xdoc.project.update", async (node:Node)=> {
            if (node.project && !node.project.loading) {
                node.project.loading = true
                this.projectProvider?.changed(node)
                const updateRes = await this.projects[0].source.update()
                if (!updateRes.ok) {
                    vscode.window.showErrorMessage(`Couldn't update project. ${updateRes.errorMessage}`)
                }
                node.project.loading = false
                this.projectProvider?.changed(node)
            }
        }))
        
        context.subscriptions.push(vscode.commands.registerCommand("xdoc.project.search", async (node:Node)=> {
            if (node.project) {
                // todo: check if search view is already open, also should remember current results
                this.loadSearchInViewer(node.project)
            }
        }))
    }

    #documentWatch:vscode.Disposable|undefined
    #current:{source:SourceAdapter, uri:string, title:string}|undefined // info about currently opened doc. maybe later this will be attached to the given webview panel (if multiple panels are added)

    private async openDocument(source:SourceAdapter, docUri:string, title:string) {
        const document = await getDocument(source, docUri)
        if (document) {
            this.#current = { source, uri: docUri, title }
            this.loadDocumentInViewer(document, title, {scrollToTop: true}) 
            this.#documentWatch?.dispose() // dispose old watch
            if (document.source == source) { // document may have external source, like a https:// uri for someting external
                this.#documentWatch = source.watchDocument(docUri, async ()=> {
                    const newDoc = await source.getDocument(docUri)
                    if (newDoc)
                        this.loadDocumentInViewer(newDoc, title, {scrollToTop: false}) 
                })
            }
        }
        
    }

    async addProject(projSource:SourceAdapter) {
        const proj:Project = {
            source: projSource,
            projectTree: await projSource.getProjectTree(),
            subs: [],
            docSearch: new DocSearch(projSource),
            searchState: { query: "" }
        }
        this.projects.push(proj)
        this.projectProvider?.projectAdded(proj)
        
        proj.subs.push(proj.source.onProjectTreeChanged((newTree)=> {
            proj.projectTree = newTree
            this.projectProvider?.projectChanged(proj) 
        }))

        // if vebview panel is active, we should dispose it and recreate, as a new localResource should be added
        if (this.#viewerPanel) {
            const wasVisible = this.#viewerPanel.visible
            const current = this.#current
            this.#viewerPanel.dispose()
            this.createViewerPanel()
            if (wasVisible && current) {
                this.openDocument(current.source, current.uri, current.title)
            }
        }
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
            linkify: true,
            html: true
        })
        const defaultImageRenderer = md.renderer.rules.image
        md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx]
            const srcIndex = token.attrIndex('src')
            let src = token?.attrs?.[srcIndex][1] 
            if (src) {
                // resolve src relative to document's full URL
                try {
                    const resolvedUrl = new URL(src, document.url)
                    src = resolvedUrl.toString()
                    if (resolvedUrl.protocol == "file:")
                        src = this.viewerPanel.webview.asWebviewUri(vscode.Uri.parse(src)).toString();
                    (token.attrs as any)[srcIndex][1] = src
                } catch (__) { /* URL parse error */  }
            }

            return defaultImageRenderer?.(tokens, idx, options, env, self) ?? ""
        }
        
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
        
        if (options.scrollToTop) { // refresh doesn't scroll nor reveals the panel
            this.viewerPanel.webview.postMessage({command:"scrollToTop"})
            this.viewerPanel.reveal()
        }
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

    private loadSearchInViewer(proj:Project) {
        const asWebviewUri = (path:string) => this.viewerPanel.webview.asWebviewUri(vscode.Uri.file(path))
        
        const markdownCss = asWebviewUri(path.join(this.#extensionPath, "www", "markdown.css"))
        const viewerCss = asWebviewUri(path.join(this.#extensionPath, "www", "viewer.css"))
        const viewerJs = asWebviewUri(path.join(this.#extensionPath, "www", "viewer.js"))
        const searchJs = asWebviewUri(path.join(this.#extensionPath, "www", "search.js"))
        
        
        const htmlContent = 
            `
            <head>
                <link rel="stylesheet" type="text/css" href="${markdownCss}">
                <link rel="stylesheet" type="text/css" href="${viewerCss}">
                <script src="${viewerJs}"></script>
                <script src="${searchJs}"></script>
            </head>
            <body>
                <div id="__markdown-content">
                    <h1>Search<span class="project-title">${proj.source.title}</span></h1>
                    <div id="searchbox">
                        <input id="searchinput" type="text" value="${proj.searchState.query}"  />
                    </div>
                    
                    <div id="results" >
                    </div>
                </div>
        
            </body>
            `
        
        this.viewerPanel.webview.html = htmlContent
        this.viewerPanel.title = "Search"
        
        
        this.viewerPanel.webview.postMessage({command:"scrollToTop"})
        this.viewerPanel.reveal()
    }

    #viewerPanel:vscode.WebviewPanel | undefined
    private createViewerPanel() {
        const panel = vscode.window.createWebviewPanel(
            'mDoc',
            'XDoc viewer',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(this.#extensionPath), 
                                     ...this.projects.filter(proj => proj.source.rootUrl.protocol == "file:")
                                     .map(proj => vscode.Uri.parse(proj.source.rootUrl.toString()))]
            },
        );       
        panel.iconPath = {
            light: vscode.Uri.file(path.join(this.#extensionPath, "media/library_books-light.svg")),
            dark: vscode.Uri.file(path.join(this.#extensionPath, "media/library_books-dark.svg")),
        }
        panel.onDidDispose(()=> {
            this.#viewerPanel = undefined // remove the cached panel, a new one will open next time
            this.#current = undefined
        })
        panel.webview.onDidReceiveMessage(message=> {
            if (message.command == "openLink" && this.#current) {
                const base = /^[a-z][a-z\d.+-]+:/i.test(this.#current.uri) ? this.#current.uri : `mdoc:///${this.#current.uri}` // if current has no scheme, we add one, otherwise URL parse fails
                const docUrl = new URL(message.href, base)
                // the final url is the path part for mdoc urls, otherwise the whole thing (for http, https ex.)
                const url = docUrl.protocol == "mdoc:" ? docUrl.pathname.substr(1) : docUrl.toString()
                // reveal doc in the tree, if it is found in sidebar
                const documentNode = this.projectProvider?.getNodeForUri(this.#current.source, url )
                if (documentNode)
                    this.projectTree?.reveal(documentNode)
                
                this.openDocument(this.#current.source, url, message.title)
            } else if (message.command == "search") {
                // todo: should link search with a given project
                const project = this.projects[0]
                this.scheduleSearch(project, message.query)
            }
        })
        return panel
    }

    #searchTimeout:NodeJS.Timeout|undefined
    scheduleSearch(project:Project, query:string) {
        if (this.#searchTimeout)
            clearTimeout(this.#searchTimeout)
        this.#searchTimeout = setTimeout(async ()=> {
            this.#searchTimeout = undefined
            const results = await project.docSearch.search(query)
            this.viewerPanel.webview.postMessage({
                command: "searchResults",
                results
            })
        }, 300)    
    }
}

export const docViewer = new DocViewer();

class Node { // a node in the project tree sidebar
    parent?: Node
    label:string
    docUri?:string
    project?:Project

    children: Node[]

    constructor(source:{label:string, docUri?:string, parent?:Node, children:TreeNode[], project?:Project}) {
        this.parent = source.parent
        this.label = source.label
        if (source.project)
            this.project = source.project
        this.docUri = source.docUri
        this.children = source.children.map(tn => new Node({parent:this, label: tn.label, docUri: tn.docUri, children: tn.children}))
    }

    get depth() {
        let depth = 1
        let node:Node = this
        for (;node.parent; node = node.parent)
            ++depth
        return depth
    }
    get source() {
        let n:Node|undefined = this
        for (;n; n = n.parent) {
            if (n.project) return n.project.source
        }
    }
}

function *eachNode(node:Node):Generator<Node> {
    yield node;
    for (const child of node.children) {
        yield *eachNode(child)
    }
}

class ProjectTreeProvider implements vscode.TreeDataProvider<Node> {
    #onDidChangeTreeData = new vscode.EventEmitter<Node|undefined>()
    get onDidChangeTreeData() { return this.#onDidChangeTreeData.event }
    private nodes:Node[] = []
    private nodesByUri = new Map<SourceAdapter, Map<string, Node>>()

    constructor(private docViewer:DocViewer) {

    }
    
    getTreeItem(node:Node) {
        // items on the first two levels will be open, otherwise collapsed
        let collapsibleState = vscode.TreeItemCollapsibleState.None
        if (node.children.length > 0) {
            collapsibleState = node.depth <= 2 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        } else if (!node.parent) collapsibleState = vscode.TreeItemCollapsibleState.Expanded // root project node
        const item = new vscode.TreeItem(node.label, collapsibleState)
        if (node.children.length) {
            item.iconPath = node.docUri ? new vscode.ThemeIcon("files") : new vscode.ThemeIcon("file-directory")
        } else {
            item.iconPath = node.docUri ? new vscode.ThemeIcon("file-text") : new vscode.ThemeIcon("circle-slash")
        }
        if (node.docUri && (node.docUri.startsWith("http:") || node.docUri.startsWith("https:")))
            item.iconPath = new vscode.ThemeIcon("link") // linked document
        if (node.project) { // project node
            item.contextValue = "project"
            if (node.project.loading) {
                item.iconPath = new vscode.ThemeIcon("tree-item-loading")
                item.description = "loading..."
            }
            
        }
        item.command = {
            command: "xdoc.openFromSidebar",
            title: "Open document",
            arguments: [node]
        }
        return item
    }

    getChildren(node:Node | undefined) {
        if (node) {
            return node.children
        } else {
            return this.nodes
        }
    }

    getParent(node:Node) {
        return node.parent
    }

    changed(node?:Node) {
        this.#onDidChangeTreeData.fire(undefined)
    }

    getNodeForUri(source:SourceAdapter, docUri:string) {
        return this.nodesByUri.get(source)?.get(docUri)
    }

    projectAdded(proj:Project) {
        this.nodes.push(new Node({ label: proj.source.title, docUri: 'README.md', 
                                   project:proj, children: proj.projectTree.children}))
        
        this.updateUriMappings(proj.source, this.nodes[this.nodes.length - 1])
        this.changed()   
    }

    projectChanged(proj:Project) {
        const idx = this.nodes.findIndex(n => n.source == proj.source)
        this.nodes[idx] = new Node({ label: proj.source.title, docUri: 'README.md', 
                                   project:proj, children: proj.projectTree.children})
        this.updateUriMappings(proj.source, this.nodes[idx])
        this.changed(this.nodes[idx])   
    }

    private updateUriMappings(source:SourceAdapter, rootNode:Node) {
        const mappings = new Map<string, Node>()
        for (const node of eachNode(rootNode)) {
            if (node.docUri)
                mappings.set(node.docUri, node)
        }
        this.nodesByUri.set(source, mappings)
    }
}