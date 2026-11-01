var vscodeApi = (window as any).acquireVsCodeApi(); // can be called only once per webview

let searchId = 0;

// click handler from vscode markdown preview
// clicking on links should be passed to the extension, to handle opening new documents
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

// On page loaded
window.addEventListener('load', (event) => {
    const input = document.getElementById("searchinput") as HTMLInputElement;
    if (input) {
        input.oninput = (inputEvent) => {
            if (inputEvent.target) {
                const query = (inputEvent.target as HTMLInputElement).value;
                vscodeApi.postMessage({
                    command: "search",
                    query,
                    searchId
                });
            }
        };
        input.focus();

        searchId = parseInt(input.getAttribute("data-searchId") ?? '');
        console.log("searchId: ", searchId);
    }
});

// On message
window.addEventListener('message', (messageEvent) => {
    const message = messageEvent.data; // The JSON data our extension sent
    if (message.command === "searchResults") {
        const resultsDiv = document.getElementById("results") as HTMLDivElement;
        resultsDiv.textContent = ""; // clear contents
        for (const res of message.results) {
            resultsDiv.insertAdjacentHTML("beforeend", `<p class="result-path">${res.docPath ? res.docPath : res.title}</p>`);
            resultsDiv.insertAdjacentHTML("beforeend", `<a href="${res.url}"><h2>${res.title}</h2></a>`);
            resultsDiv.insertAdjacentHTML("beforeend", `<p class="detail" >${res.content}</p>`);
        }
    }
    if (message.command === "searchProgress") {
        // update progress display (ex. index)
    }
});