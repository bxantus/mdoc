import { MarkdownParser, ParseListener } from "../parser/mdParser";
import { Range, Position } from "vscode";

export class Document {
    markdownContent:Buffer
     // some kind of functionality would be beneficial to query the first few paragraphs of a heading

    constructor(data:{markdownContent:Buffer}) {
        this.markdownContent = data.markdownContent
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