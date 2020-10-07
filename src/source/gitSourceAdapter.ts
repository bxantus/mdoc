import { SourceAdapter, ProjectTree, TreeNode, UpdateResult } from "./sourceAdapter"
import { URL } from "url";
import { Document } from "./document";
import {promises as fs, watch as fsWatch, FSWatcher} from "fs"
import { MarkdownParser, ParseListener } from "../parser/mdParser";
import { EventEmitter } from "vscode";
import { ChildProcess, spawn } from "child_process";

export class GitSource implements SourceAdapter {
    private path:string = "" // path to the root of the repository on the file system
    #title = "<no title>"
    #rootUrl:URL
    #uri:string
    private remoteUrl = ""

    get rootUrl() { return this.#rootUrl }
    get uri() { return this.#uri }

    constructor(uri:string) {
        this.#uri = uri
        let location = new URL(uri)
        // location may be a hard disk location, also .git url to the repository
        // in case of repo url, the extension will manage the repository on the hard drive
        if (location.protocol == "file:") {
            this.path = decodeURIComponent(location.pathname).substr(1)
        } else {
            this.remoteUrl = uri
            // todo: should clone repo if not already cloned (check project folder). folder name or path, should be generated based on remote url host and path
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
        try {
            const fileName = `${this.path}/${decodeURIComponent(uri)}` 
            const buf = await fs.readFile(fileName)
            return new Document({ markdownContent: buf, url: `file:///${fileName}`, source: this, projectUrl:uri })

        } catch(err) {
            // document may not exist
        }
        return undefined
    }

    getDocumentFileLocation(uri:string):string {
        return `${this.path}/${decodeURIComponent(uri)}` 
    }

    watchDocument(uri:string, onChange:()=>void) {
        const watch = fsWatch(`${this.path}/${decodeURIComponent(uri)}`, undefined, async (event) => { // todo: decodeURIComponenet could throw exceptions, fsWatch too, if name is invalid
            if (event == "change") 
                onChange()
        })
        return {
            dispose() { watch.close(); }
        }
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

    update() {
        // todo: generalize git process spawning with promise interface, and use that here, see the one in getRemoteUrl as a base
        return new Promise<UpdateResult>((resolve, reject)=>{
            const gitProcess = spawn("git pull", { 
                shell:true,
                cwd: this.path,
                stdio: [undefined, undefined, 'pipe' ] // stderr will be read
            })
            let errorMessage = ""
            gitProcess.stderr.on('data', (chunk) => {
                errorMessage += chunk.toString()
            })
            gitProcess.on('exit', (exitCode, signal) => {
                if (signal != null) { // process was terminated
                    resolve({ok: false, errorMessage: `pull was terminated by signal ${signal}`})
                } else {
                    if (exitCode == 0) { // normal run
                        resolve({ok: true})
                    } else resolve({ok: false, errorMessage: errorMessage})
                }
            })
            gitProcess.on('error', (err) => {
                resolve({ok: false, errorMessage: `${err.message}`})
            })
            
        })        
    }

    async getRemoteUrl():Promise<string> {
        if (this.remoteUrl.length > 0)
            return this.remoteUrl
        const urlRes = await new Promise<string>((resolve, reject)=>{ // todo: take in account this git process in process spawn generalization
                                                        //       should use GitError class for throwing
            const gitProcess = spawn("git remote get-url origin", { 
                shell:true,
                cwd: this.path,
                stdio: [undefined, 'pipe', 'pipe' ] // stdout and stderr will be read
            })
            let errorMessage = ""
            let output = ""
            gitProcess.stderr.on('data', (chunk) => {
                errorMessage += chunk.toString()
            })
            gitProcess.stdout.on('data', (chunk) => {
                output += chunk.toString()
            })
            gitProcess.on('exit', (exitCode, signal) => {
                if (signal != null) { // process was terminated
                    reject( new Error(`'git remote get-url origin' was terminated by signal ${signal}`))
                } else {
                    if (exitCode == 0) { // normal run
                        resolve(output)
                    } else reject(new Error(errorMessage))
                }
            })
            gitProcess.on('error', (err) => {
                reject(new Error(`${err.message}`))
            })
        })
        this.remoteUrl = urlRes.trim()
        return this.remoteUrl
    }
}