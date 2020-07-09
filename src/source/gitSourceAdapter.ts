import { SourceAdapter, ProjectTree, TreeNode } from "./sourceAdapter"
import { URL } from "url";
import { DocSearchIndex } from "../search/docSearch";
import { Document } from "./document";
import {promises as fs, watch as fsWatch, FSWatcher} from "fs"
import { MarkdownParser, ParseListener } from "../parser/mdParser";
import { EventEmitter } from "vscode";

export class GitSource implements SourceAdapter {
    private path:string = "" // path to the root of the repository on the file system
    #title = "<no title>"
    #rootUrl:URL
    get rootUrl() { return this.#rootUrl }

    constructor(location:URL) {
        // location may be a hard disk location, also .git url to the repository
        // in case of repo url, the extension will manage the repository on the hard drive
        if (location.protocol == "file:") {
            this.path = decodeURIComponent(location.pathname).substr(1)
        }
        this.#rootUrl = location
        this.init()
    }

    dispose() {
        if (this.#indexWatch)
            this.#indexWatch.close()
    }

    get title() { return this.#title }

    async getProjectTree():Promise<ProjectTree> {
        if (!this.projectTree) 
            this.projectTree = this.loadProjectTree()
        return this.projectTree
    }

    async getDocument(uri:string):Promise<Document|undefined> {
        // it is expected that uri is a relative one, from the project's path
        const fileName = `${this.path}/${uri}`
        try {
            const buf = await fs.readFile(fileName)
            return new Document({ markdownContent: buf, url: `file:///${fileName}`, source: this })

        } catch(err) {
            // document may not exist
        }
        return undefined
    }

    watchDocument(uri:string, onChange:()=>void) {
        const watch = fsWatch(`${this.path}/${uri}`, undefined, async (event) => {
            if (event == "change") 
                onChange()
        })
        return {
            dispose() { watch.close(); }
        }
    }

    async *searchIndex():AsyncGenerator<DocSearchIndex, void, unknown> {

    }

    get onProjectTreeChanged() { return this.#projectTreeChanged.event }
    get onTitleChanged() { return this.#titleChanged.event }

    #indexWatch:FSWatcher|undefined
    private init() {
        // update projectTree
        this.projectTree = this.loadProjectTree()
        
        // watch changes in index.md
        this.#indexWatch = fsWatch(`${this.path}/index.md`, undefined, async (event) => {
            if (event == "change") {
                this.reloadProjectTree()
            }
        })
    
        // fetch heading indexes
    }

    private projectTree:ProjectTree|Promise<ProjectTree>|undefined
    #projectTreeChanged = new EventEmitter<ProjectTree>()
    #titleChanged = new EventEmitter<string>()

    private async loadProjectTree() {
        try {
            // fetch index.md and load structure from it
            const contents = await fs.readFile(`${this.path}/index.md`) 
            const res = this.parseProjectTree(contents)
            this.#title = res.title    
            return res.tree
        } catch (__) {
            // file doesn't exist    
            // todo:  walk the directories in the repository and build from that
        } 
        
        this.#title = this.path.substr(this.path.lastIndexOf('/') + 1) // title will become the directory of repo
        return { children:[] }
    }

    private parseProjectTree(contents:Buffer) {
        const parser = new MarkdownParser(contents)
        let title = this.#title
        const tree:ProjectTree = { children:[] }
        let activeTree:{children:TreeNode[]} = tree
        let currNode:TreeNode|undefined 
        // add nodeStack so we can traverse the tree while lists are closed, opened
        const nodeStack:{children:TreeNode[]}[] = []

        let listener:ParseListener = {  
            enterHeading(level) {
                if (level == 1) this.text = (text) => {
                    title = text
                }
            },

            leaveHeading(level) {
                if (level == 1) this.text = undefined
            },

            enterList(level) {
                if (currNode) {
                    nodeStack.push(activeTree)
                    activeTree = currNode
                }
                else activeTree = tree // first list, or toplevel list
            },

            leaveList(level) {
                // pop activeTree, there's always an item in it
                activeTree = nodeStack.pop() as {children:TreeNode[]}
                currNode = undefined
            },

            enterListItem() {
                this.text = (text) => {
                    let node = currNode = {children: [], label: text}
                    activeTree.children.push(node)
                }
                this.link = (text, href) => {
                    let node = currNode = {children: [], label: text, docUri: href}
                    activeTree.children.push(node)
                }
            },

            leaveListItem() {
                this.text = undefined
            }
        }
        
        parser.parse(listener)
        return {tree ,title}
    }

    #reloadTimeout:NodeJS.Timeout|undefined
    private reloadProjectTree() {
        if (!this.#reloadTimeout)
            this.#reloadTimeout = setTimeout(async () => {
                this.#reloadTimeout = undefined
                const oldTitle = this.title
                this.projectTree = await this.loadProjectTree()
                this.#projectTreeChanged.fire(this.projectTree)
                if (this.title != oldTitle)
                    this.#titleChanged.fire(this.title)
            }, 500)
    }
}