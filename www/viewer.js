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
})