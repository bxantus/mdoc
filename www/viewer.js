const vscode = acquireVsCodeApi(); // can be called only once

// click handler from vscode markdown preview
// clicking on links should be passed to the extension, to handle opening new documents
document.addEventListener("click", e=>{
    if (!e)
        return;
    let t = e.target;
    for (; t; ) {
        const href = t.tagName == "A" ? t.getAttribute("href") : undefined;
        if (t.tagName && "A" === t.tagName && href) {
            if (href.startsWith("#"))
                return;
            const url = new URL(href, "file:///") // `file:///` is added as base, so href is completely resolved, if is relative
                                                  // won't use the file protocol, just checks http, https and pathname parts
            if ((url.protocol == "http:" || url.protocol == "https:") && !url.pathname.endsWith(".md")) // check some scheme types, which should open in external browser
                return;                                                                                 // but .md files will be resolved by mdoc
            
            return (vscode.postMessage({
                        command: "openLink",
                        href,
                        title: t.textContent 
                    }),
                    e.preventDefault(),
                    e.stopPropagation())
        }
        t = t.parentNode
    }
})

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    const handlers = {
        scrollToTop() {
            document.getElementsByTagName('html')[0].scrollTop = 0 // embedded html is scrolled
        },
    }
    const action = handlers[message.command]
    if (action)
        action(message)
})

window.addEventListener('load', () => {
    const urlCopy = document.getElementById("copy-url")
    urlCopy.onclick = e => {
        vscode.postMessage({
            command: "copyUrl"
        })
    }
    const findWidget = new FindWidget()
    window.top.findWidget = findWidget // for easier debugging
    const marker = new Mark(document.getElementById("__markdown-content"))
    window.addEventListener("keydown", keyEvt => {
        if (keyEvt.key == "Escape") {
            if (findWidget.isOpen) findWidget.close()
        } else if (keyEvt.key == "f" && (keyEvt.ctrlKey || keyEvt.metaKey)) {
            if (!findWidget.isOpen) findWidget.open()
            findWidget.focus()
        }
    })
    findWidget.onInputChanged(val => {
        marker.unmark({done() {
            if (val != "") {
                marker.mark(val, {
                    done: numRes => {
                        const results = document.querySelectorAll("mark")
                        findWidget.setResults(results)
                    }
                })
            } else findWidget.setResults([])
        }})
    })
})

class FindWidget {
    constructor() {
        this.element = document.createElement("div")
        this.element.id = "__find"
        this.element.classList.add("closed")
        this.input = document.createElement("input")
        this.input.type = "text"
        this.input.placeholder = "Find"

        this.findPosition = document.createElement("span")
        this.findPosition.classList.add("position")
        this.findPosition.innerHTML = "No Results"

        
        this.optCaseSensitive = this.createIcon({class:"option case", icon:"case-sensitive", title:"Match Case"})
        this.optRegex = this.createIcon({class:"option regex", icon:"regex", title:"Use Regular Expression"})
        this.prevResult = this.createIcon({icon: "arrow-up", title:"Previous match (Shift+Enter)", class:"disabled action"})
        this.nextResult = this.createIcon({icon: "arrow-down", title:"Next match (Enter)", class:"disabled action"})
        this.closeIco = this.createIcon({icon: "close", title:"Close (Escape)", class:"action"})
        
        const inputContainer = document.createElement("div")
        inputContainer.classList.add("input-container")
        inputContainer.append(this.input, this.optCaseSensitive, this.optRegex)
        this.element.append(inputContainer,
                            this.findPosition,
                            this.prevResult, this.nextResult, this.closeIco)
        this.results = []
        this.setup()
    }

    createIcon(options = { icon:"", class: "", title: "" }) {
        const ico = document.createElement("i")
        ico.title = options.title
        ico.classList.value = options.class
        ico.classList.add("codicon", `codicon-${options.icon}`)
        return ico
    }

    setup() {
        document.getElementsByTagName("body")[0].append(this.element)
        this.closeIco.onclick = evt => {
            this.close()
        }
        this.optRegex.onclick = this.optCaseSensitive.onclick = evt => {
            evt.currentTarget.classList.toggle("active")
            this.focus()
        }
    }
    
    get isOpen() {
        return this.element.classList.contains("open")
    }

    open() {
        const classes = this.element.classList
        classes.remove("closed")
        classes.add("open")
    }


    close() {
        const classes = this.element.classList
        classes.add("closed")
        classes.remove("open")
    }

    focus() {
        this.input.focus()
    }

    onInputChanged(listener) {
        this.input.addEventListener("input",  e => listener(this.input.value))
    }

    setResults(results) {
        this.results = results
        if (results && results.length > 0) {
            results[0].scrollIntoView()
            this.findPosition.textContent = `1 of ${results.length}`
        } else {
            this.findPosition.textContent = "No Results"
        }
    }
}
