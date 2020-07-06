import { SourceAdapter, ProjectTree, TreeNode } from "./sourceAdapter"
import { URL } from "url";
import { DocSearchIndex } from "../search/docSearch";
import { Document } from "./document";
import {promises as fs} from "fs"
import { MarkdownParser, ParseListener } from "../parser/mdParser";

export class GitSource implements SourceAdapter {
    private path:string = "" // path to the root of the repository on the file system
    #title = "<no title>"

    constructor(location:URL) {
        // location may be a hard disk location, also .git url to the repository
        // in case of repo url, the extension will manage the repository on the hard drive
        if (location.protocol == "file:") {
            this.path = decodeURIComponent(location.pathname).substr(1)
        }
        this.init()
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
            return { markdownContent: buf }

        } catch(err) {
            // document may not exist
        }
        return undefined
    }

    async *searchIndex():AsyncGenerator<DocSearchIndex, void, unknown> {

    }

    private init() {
        // update projectTree
        this.projectTree = this.loadProjectTree()
        // fetch heading indexes
    }

    private projectTree:ProjectTree|Promise<ProjectTree>|undefined

    private async loadProjectTree() {
        // fetch index.md and load structure from it
        const contents = await fs.readFile(`${this.path}/index.md`) // todo: catch errors, file may not exist!
        const parser = new MarkdownParser(contents)
        let title = this.#title
        const tree:ProjectTree = { children:[] }
        let activeTree:{children:TreeNode[]} = tree
        let currNode:TreeNode|undefined 
        const nodeStack:{children:TreeNode[]}[] = []
        // add nodeStack so we can traverse the tree while lists are closed, opened


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
        this.#title = title
        // todo: if no index.md is present: walk the directories in the repository and build from that

        return tree
    }
}