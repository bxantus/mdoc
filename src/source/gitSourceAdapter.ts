import { SourceAdapter, ProjectTree, TreeNode } from "./sourceAdapter"
import { URL } from "url";
import { DocSearchIndex } from "../search/docSearch";
import { Document } from "./document";
import  MarkdownIt from "markdown-it"
import * as fs from "fs"
import { promisify } from "util";
import { MarkdownParser, ParseListener } from "../parser/mdParser";

const readFile = promisify(fs.readFile)

export class GitSource implements SourceAdapter {
    private path:string = "" // path to the root of the repository on the file system

    constructor(location:URL) {
        // location may be a hard disk location, also .git url to the repository
        // in case of repo url, the extension will manage the repository on the hard drive
        if (location.protocol == "file:") {
            this.path = location.pathname.substr(1)
        }
        this.init()
    }


    async getProjectTree():Promise<ProjectTree> {
        return { children: [] }
    }

    async getDocument(uri:string):Promise<Document|undefined> {
        return undefined
    }

    async *searchIndex():AsyncGenerator<DocSearchIndex, void, unknown> {

    }

    private init() {
        // update projectTree
        this.loadProjectTree()
        // fetch heading indexes
    }

    private projectTree:ProjectTree|Promise<ProjectTree>|undefined

    private async loadProjectTree() {
        // fetch index.md and load structure from it
        const contents = await readFile(`${this.path}/index.md`) // todo: catch errors, file may not exist!
        const parser = new MarkdownParser(contents)
        let title = "no title"
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
        console.log("Parsed index.md. title: ", title)
        // if no index.md is present: walk the directories in the repository and build from that
    }
}