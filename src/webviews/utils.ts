
// click handler from vscode markdown preview
// clicking on links should be passed to the extension, to handle opening new documents
export function addOnClickListener() {
    document.addEventListener("click", event => {
        if (!event) {
            return;
        }
        let t = event.target;
        for (; t;) {
            const href = (t as HTMLElement).tagName === "A" ? (t as HTMLElement).getAttribute("href") : undefined;
            if ((t as HTMLElement).tagName && "A" === (t as HTMLElement).tagName && href) {
                if (href.startsWith("#")) {
                    return;
                }
                const url = new URL(href, "file:///"); // `file:///` is added as base, so href is completely resolved, if is relative
                // won't use the file protocol, just checks http, https and pathname parts
                if ((url.protocol === "http:" || url.protocol === "https:") && !url.pathname.endsWith(".md")) { // check some scheme types, which should open in external browser
                    return;
                }                                                                               // but .md files will be resolved by mdoc

                return (vscodeApi.postMessage({
                    command: "openLink",
                    href,
                    title: (t as HTMLElement).textContent
                }),
                    event.preventDefault(),
                    event.stopPropagation());
            }
            t = (t as HTMLElement).parentNode;
        }
    });
}