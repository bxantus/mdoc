import { SourceAdapter, TreeNode as ProjectNode, getDocument } from "../source/sourceAdapter";
import lunr from "lunr"
import { Document } from "../source/document";
import { MarkdownParser } from "../parser/mdParser";

interface DocumentData {
    id:number
    title:string
    body:string // full document body, without markup
    url:string
}

export interface SearchResult {
    title: string
    url: string
    content: string
}

export class DocSearch {
    state = {
        indexed : false,
        lastSearch : ""
    }

    private lunrIndex:lunr.Index
    private docsById = new Map<number, DocumentData> ()
    
    constructor(private source:SourceAdapter) {
        this.lunrIndex = lunr(function() { // empty index
            this.field("title", {boost: 10})
            this.field("body")
        })
    }

    #indexProcess:Promise<void>|undefined

    async search(query:string):Promise<SearchResult[]> {
        if (query == "") // no results for empty query
            return []
        console.log(`Searching for: '${query}'`)
        if (!this.#indexProcess)
            this.#indexProcess = this.index()
        if (!this.state.indexed) {
            console.log("building index...")
            await this.#indexProcess
        }

        // indexing ready, can run the search
        const results =  this.lunrIndex.search(query)
        console.log(`Results (${results.length})`)
        return results.map(res => {
            const doc = this.docsById.get(parseInt(res.ref)) as DocumentData
            let contextStart:number|undefined // earliest start position of context text from result
            
            for (const term in res.matchData.metadata) {
                const matches = res.matchData.metadata[term]
                if (matches.body && matches.body.position.length > 0) {
                    const startPos:number = matches.body.position[0][0]
                    if (contextStart == undefined || startPos < contextStart)
                        contextStart = startPos
                }
            }
            if (contextStart == undefined) // will show the first n lines
                contextStart = 0
            const context = this.getContext(doc.body, contextStart)
            return {
                title: doc.title,
                url: doc.url,
                content: context
            }
        })
        
    }

    private getContext(body:string, startPos:number, numLines = 4, maxLineSize = 80) {
        let contextStart = body.lastIndexOf("\n", startPos) + 1 // will be 0 if not found (start of doc, as lastIndexOf returns -1). this is just right
        let prefix = ""
        const ellipse = "\u2026" // ...
        if (startPos - contextStart > maxLineSize) {
            contextStart = startPos - maxLineSize
            prefix = ellipse 
        }
        let contextEnd:number = contextStart - 1
        for (let line = 0; line < numLines; ++line) {
            const nextNewLine = body.indexOf("\n", contextEnd + 1)
            if (nextNewLine == -1) {
                contextEnd = body.length // will reach to the end of the doc
                break;
            }
            contextEnd = nextNewLine
        }
        let postfix = ""
        if (contextEnd - contextStart > numLines * maxLineSize) {
            contextEnd = contextStart + numLines * maxLineSize;
            postfix = ellipse
        }
        return prefix + body.substring(contextStart, contextEnd) + postfix
    }

    private async index() {
        // emit indexing state

        // walk the project tree and index, all the documents + document titles
        // (later maybe headings will be indexed too)
        const indexBuilder = new lunr.Builder()
        indexBuilder.field("title", { boost: 10})
        indexBuilder.field("body")
        indexBuilder.metadataWhitelist = ["position"] // with the help of whitelisting we'll get match positions in the result
                                                      // see: https://lunrjs.com/guides/core_concepts.html#search-results
        const tree = await this.source.getProjectTree()
        const visitedDocs = new Set<string>()
        // walk the documents, and index all of them, emit index progress
        for (const docData of documents(tree.children)) {
            if (docData.uri) { 
                if (!visitedDocs.has(docData.uri)) {
                    visitedDocs.add(docData.uri)
                    const doc = await getDocument(this.source, docData.uri)
                    if (doc) this.indexDocument(doc, docData.label, indexBuilder) 
                }
            }
        }
        this.lunrIndex = indexBuilder.build()
        this.state.indexed = true
        //emit indexing complete
    }

    private async updateIndex() {
        // updating index should be done with reparsing just the changed documents (use timestamp maybe)
        // the whole index has to be rebuilt! (as lunr indices as immutable)
    }

    private indexDocument(doc:Document, label:string, builder:lunr.Builder) {
        // get title from document
        const parser = new MarkdownParser(doc.markdownContent)
        let title:string|undefined
        let readTitle:boolean = false
        parser.parse({
            enterHeading(level) {
                if (level == 1 && title == undefined)
                    readTitle = true
            },
            leaveHeading(level) {
                if (level == 1) {
                    readTitle = false
                    // todo: could finish parsing here
                }
            },
            text(text) {
                if (readTitle)
                    title = title == undefined ? text : title + text
            },
        })
        if (!title)
            title = label
        const data:DocumentData = {
            id: this.docsById.size,
            title,
            body: doc.markdownContent.toString(),
            url: doc.projectUrl
        }
        this.docsById.set(data.id, data)
        builder.add(data)
    }
}

function* documents(docs:ProjectNode[]):Generator<{uri?:string, label:string}> {
    for (const child of docs) {
        yield { uri: child.docUri, label: child.label }
        yield* documents(child.children)
    }
}