const vscode = acquireVsCodeApi(); // can be called only once

// click handler from vscode markdown preview
// clicking on links should be passed to the extension, to handle opening new documents
document.addEventListener("click", e=>{
    if (!e)
        return;
    let t = e.target;
    for (; t; ) {
        if (t.tagName && "A" === t.tagName && t.href) {
            if (t.getAttribute("href").startsWith("#"))
                return;
            if (v.some(e=>t.href.startsWith(e))) // check some scheme types, which should open in external browser
                return;
            const n = t.getAttribute("data-href") || t.getAttribute("href");
            return /^[a-z\-]+:/i.test(n) ? 0 : (vscode.postMessage("openLink", {
                href: n
            }),
            e.preventDefault(),
            e.stopPropagation())
        }
        t = t.parentNode
    }
})