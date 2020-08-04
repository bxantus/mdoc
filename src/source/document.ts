import { MarkdownParser, ParseListener } from "../parser/mdParser";
import { Range, Position } from "vscode";
import { SourceAdapter } from "./sourceAdapter";

export class Document {
    url:string // document's fully resolved url, all internal links should be resolved relative to this one
    projectUrl:string // url relative to the source project
    markdownContent:Buffer
    source?:SourceAdapter

    constructor(data:{markdownContent:Buffer, url:string, source?:SourceAdapter, projectUrl:string}) {
        this.markdownContent = data.markdownContent
        this.url = data.url
        this.projectUrl = data.projectUrl
        this.source = data.source
    }

    #headings:Heading[]|undefined 
    getHeadings(maxLevel = 3):Heading[] {
        if (this.#headings == undefined) {
            const headings:Heading[] = this.#headings = []
            const parser = new MarkdownParser(this.markdownContent)
            let headingText = ""
            let headingSourceStart:Position 
        
            parser.parse({
                enterHeading(level, source) {
                    if (level <= maxLevel) {
                        headingText = ""
                        headingSourceStart = source?.start ?? new Position(0, 0)
                        this.text = text => headingText += text
                        this.codeInline = text => headingText += "`" + text + "`" // (re)surround inline code blocks with backticks
                                                                                  // todo: should wrap with double backticks, when text itself contains backticks (see markdown spec)
                        this.link = text => headingText += text
                    }
                },
                leaveHeading(level, source) {
                    if (level <= maxLevel) {
                        headings.push({
                                        level:level, title: headingText, 
                                        source: new Range(headingSourceStart, source?.end ?? new Position(headingSourceStart.line + 1, 0))
                                    })
                        this.text = this.codeInline = this.link = undefined
                    }
                },
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