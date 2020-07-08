const vscode = acquireVsCodeApi(); // can be called only once

// click handler from vscode markdown preview
// clicking on links should be passed to the extension, to handle opening new documents
document.addEventListener("click", e=>{
    if (!e)
        return;
    let t = e.target;
    for (; t; ) {
        const href = t.getAttribute("href");
        if (t.tagName && "A" === t.tagName && href) {
            if (href.startsWith("#"))
                return;
            if (["http", "https"].some(e=>href.startsWith(e))) // check some scheme types, which should open in external browser
                return;
            
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