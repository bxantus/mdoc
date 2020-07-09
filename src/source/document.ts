import { MarkdownParser, ParseListener } from "../parser/mdParser";
import { Range, Position } from "vscode";
import { SourceAdapter } from "./sourceAdapter";

export class Document {
    url:string // document's fully resolved url, all internal links should be resolved relative to this one
    markdownContent:Buffer
    source?:SourceAdapter
     // some kind of functionality would be beneficial to query the first few paragraphs of a heading

    constructor(data:{markdownContent:Buffer, url:string, source?:SourceAdapter}) {
        this.markdownContent = data.markdownContent
        this.url = data.url
        this.source = data.source
    }

    #headings:Heading[]|undefined 
    getHeadings():Heading[] {
        if (this.#headings == undefined) {
            const headings:Heading[] = this.#headings = []
            const parser = new MarkdownParser(this.markdownContent)
            let headingText = ""
            let headingSourceStart:Position 
        
            parser.parse({
                enterHeading(level, source) {
                    headingText = ""
                    headingSourceStart = source?.start ?? new Position(0, 0)
                },
                leaveHeading(level, source) {
                    headings.push({
                                    level:level, title: headingText, 
                                    source: new Range(headingSourceStart, source?.end ?? new Position(headingSourceStart.line + 1, 0))
                                })
                },
                text(text) {
                    headingText += text
                }
            })
        }
        return this.#headings
    }
}

export interface Heading {
    level: number
    title: string
    source:Range
}