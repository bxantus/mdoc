import { Heading } from "../source/document"
import { URL } from "url";

export interface DocSearchIndex {
    title:string // title of the document (this is mostly it's filename). this has the highest priority in matches
    docUri: URL  // url of the indexed document
    headings: Heading[] // list of headings in file, lower level headings have higher priority
}

