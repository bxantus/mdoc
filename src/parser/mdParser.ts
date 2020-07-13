import { Range } from "vscode";
import MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token";

export class MarkdownParser {
    // NOTE: currently using markIt for parsing, this may change in the future, with a hand written parser
    md:MarkdownIt
    constructor(private buf:Buffer) {
        this.md = new MarkdownIt({html: true, linkify:true})
    }

    parse(listener:ParseListener) {
        const tokens = this.md.parse(this.buf.toString(), {})
        let headingLevel = 0
        let listLevel = 0
        let link = {
            active: false,
            text: "",
            href: ""
        }

        const performAction = (token:Token) => {
            const source = token.map ? new Range(token.map[0], 0, token.map[1], 0) : undefined
            const action = actions[token.type]
            if (action) action(token, source)
        }

        const actions = {
            heading_open(token:Token, source?:Range) {
                headingLevel = parseInt(token.tag.substr(1)) // the end of h1, h2 etc.
                listener.enterHeading?.(headingLevel, source)
            },
            heading_close(token:Token, source?:Range) {
                listener.leaveHeading?.(headingLevel, source)
            },

            bullet_list_open(token:Token, source?:Range) {
                listLevel++
                listener.enterList?.(listLevel, source)
            },

            bullet_list_close(token:Token, source?:Range) {
                listener.leaveList?.(listLevel, source)
                listLevel--
            },

            list_item_open(token:Token, source?:Range) {
                listener.enterListItem?.(source)
            },

            list_item_close(token:Token, source?:Range) {
                listener.leaveListItem?.(source)
            },

            inline(token:Token, source?:Range) {
                if (listener.inlineText && listener.inlineText(token.content, source))
                    return
                if (!token.children) return
                for (const child of token.children) {
                    performAction(child)
                }
            },

            link_open(token:Token) {
                link = {
                    active: true,
                    text: "",
                    href: token.attrGet("href") ?? ""
                }
            },

            link_close(token:Token, source?:Range) {
                listener.link?.(link.text, link.href, source)
                link.active = false
            },

            paragraph_open(token:Token, source?:Range) {
                listener.enterParagraph?.(source)
            },

            paragraph_colse(token:Token, source?:Range) {
                listener.leaveParagraph?.(source)
            },

            fence(token:Token, source?:Range) {
                listener.code?.(token.content, source)
            },

            text(token:Token, source?:Range) {
                if (link.active)
                    link.text += token.content
                else 
                    listener.text?.(token.content, source)
            },

        }
        for (let token of tokens) {
            performAction(token)
        }
    }
}


export interface ParseListener {
    enterHeading?:(level:number, source?:Range)=>void
    leaveHeading?:(level:number, source?:Range)=>void

    enterList?: (listLevel:number, source?:Range) => void
    leaveList?: (listLevel:number, source?:Range) => void

    enterListItem?:(source?:Range) => void
    leaveListItem?:(source?:Range) => void
    
    enterParagraph?:(source?:Range) => void
    leaveParagraph?:(source?:Range) => void

    // if you implement this method, you must state if you processed children elements (return true)
    // like images, text etc. (because text contains the textual content of these children)
    inlineText?:(text:string, source?:Range) => boolean

    text?: (text:string, source?:Range) => void
    link?: (text:string, href:string, source?:Range) => void
    code?:(text:string, source?:Range) => void
}