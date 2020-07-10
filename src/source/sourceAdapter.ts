import { URL } from "url";
import { Document } from "./document";
import { DocSearchIndex } from "../search/docSearch";
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
    getProjectTree():Promise<ProjectTree>
    getDocument(uri:string):Promise<Document|undefined>

    /// returns a watcher. call dispose on it, to stop watching
    watchDocument(uri:string, onChange:()=>void):Disposable

    
    update():Promise<UpdateResult>

    searchIndex():AsyncGenerator<DocSearchIndex, void, unknown>

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
        const buf = await fetch(docUri).then(res => res.buffer())
        return new Document({markdownContent:buf, url:docUri, source:undefined /*marks this document comes from an external source*/})
    } else return source.getDocument(docUri)
}