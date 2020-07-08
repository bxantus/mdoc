import { URL } from "url";
import { Document } from "./document";
import { DocSearchIndex } from "../search/docSearch";
import { Event, Disposable } from "vscode";

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

    searchIndex():AsyncGenerator<DocSearchIndex, void, unknown>

    onProjectTreeChanged:Event<ProjectTree>
    onTitleChanged:Event<string>
    // todo: add refresh and initialize functionality, a loading property, or event (should notify after loaded)
}

export interface ProjectTree {
    children: TreeNode[]
}

export interface TreeNode {
    // todo: do we need an id member (for ex. to reference something from the tree)
    label:string
    docUri?:string // some nodes (mostly groups, do not have an asssociated document)
    children:TreeNode[]
}
