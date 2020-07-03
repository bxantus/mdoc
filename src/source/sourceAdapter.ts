import { URL } from "url";
import { Document } from "./document";
import { DocSearchIndex } from "../search/docSearch";

/**
 * Represents the source for a documentation project.
 * Responsabilities include:
 *  - query the project tree, and contents of individual documents
 *  - watch changes in the project, and notify about changes (project tree, new documents etc)
 *  - provide access to the `document index`, used by search functionality for ex.
 *  - provide access to settings if any (ex. auto pull, caching settings...)
 **/ 
export interface SourceAdapter {
    readonly title:string
    getProjectTree():Promise<ProjectTree>
    getDocument(uri:string):Promise<Document|undefined>

    searchIndex():AsyncGenerator<DocSearchIndex, void, unknown>
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
