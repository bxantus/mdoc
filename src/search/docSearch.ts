import { SourceAdapter, TreeNode as ProjectNode, getDocument } from "../source/sourceAdapter";
import lunr from "lunr"
import { Document } from "../source/document";
import { MarkdownParser } from "../parser/mdParser";

export interface Result {
    docUri:string
    title:string
    context:string  // display this context with the search results
}

interface DocumentData {
    id:number
    title:string
    body:string // full document body, without markup
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

    async search(query:string) {
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
            let context = ""
            for (const term in res.matchData.metadata) {
                const matches = res.matchData.metadata[term]
                if (matches.body && matches.body.position.length > 0) {
                    const pos = matches.body.position[0]
                    context = doc.body.substr(Math.max(0, pos[0] - 10), 100)
                }
            }
            return {
                title: doc.title,
                content: context
            }
        })
        
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