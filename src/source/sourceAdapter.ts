import { URL } from "url";
import { Document } from "./document";
import { Event, Disposable } from "vscode";
import fetch from "node-fetch"

/**
 * Represents the source for a documentation project.
 * Responsabilities include:
 *  - query the project tree, and contents of individual documents
 *  - watch changes in the project, and notify about changes (project tree, new documents etc)
 *  - provide access to the `document index`, used by search functionality for ex.
 *  - provide access to settings if any (ex. auto pull, caching settings...)
 **/ 
export interface SourceAdapter extends Disposable {
    readonly title:string
    readonly rootUrl:URL // root URL of source's content (note this should be the local filesystem url, for cloned git repos)
    readonly uri: string // unique URI identifying this source adapter (this links it to the projects)
    getProjectTree():Promise<ProjectTree>
    getDocument(uri:string):Promise<Document|undefined>
    getDocumentFileLocation(uri:string):string

    /// returns a watcher. call dispose on it, to stop watching
    watchDocument(uri:string, onChange:()=>void):Disposable


    update():Promise<UpdateResult>
    getRemoteUrl():Promise<string>  // URL of the remote git repository for this source. for sources added from git repos, this is the same as uri. 
                                    // For sources from fs, this is the origin remote's url

    onProjectTreeChanged:Event<ProjectTree>
    onTitleChanged:Event<string>
}

export interface ProjectTree {
    children: TreeNode[]
}

export interface TreeNode {
    label:string
    docUri?:string // some nodes (mostly groups, do not have an asssociated document)
    children:TreeNode[]
}

export interface UpdateResult {
    ok:boolean
    errorMessage?:string
}

/// gets the document either form the adapter or from the web (in the case of http or https urls)
export async function getDocument(source:SourceAdapter, docUri:string):Promise<Document|undefined> {
    if (docUri.startsWith("http://") || docUri.startsWith("https://")) { // should download it from the net
        try {
            const buf = await fetch(docUri).then(res => res.buffer())
            return new Document({markdownContent:buf, url:docUri, projectUrl:docUri, source:undefined /*marks this document comes from an external source*/})
        } catch (fetcErr) { // probably document doesn't exist, or no access is granted to fetch
            return undefined
        }
    } else return source.getDocument(docUri)
}

/// This interface will be used when iterationg over the project tree
export interface TreeItemVal {
    label:string
    docUri?:string
    parent?:TreeItemVal
}

export function* allTreeItems(tree:ProjectTree, source:SourceAdapter) : Generator<TreeItemVal> {
    const root = { label: source.title, docUri:'/README.md' }
    yield root
    for (const child of tree.children) 
        yield * allTreeChildren(child, root);
}

function *allTreeChildren(tree:TreeNode, parent:TreeItemVal) {
    const itemVal = {label: tree.label, docUri: tree.docUri, parent}
    yield itemVal
    for (const child of tree.children) 
        yield * allTreeChildren(child, itemVal);
}