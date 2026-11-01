import Mark, { MarkOptions } from "mark.js";

var vscodeApi = (window as any).acquireVsCodeApi(); // can be called only once per webview

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
window.addEventListener('load', () => {
    const urlCopy = document.getElementById("copy-url");
    if (urlCopy) {
        // On click url
        urlCopy.onclick = (ev) => {
            vscodeApi.postMessage({
                command: "copyUrl"
            });
        };
    }
    // ========
    // Find box
    // ========
    const findWidget = new FindWidget();
    globalThis.findWidget = findWidget; // for easier debugging, can be accessed as: globalThis.frames[0].findWidget
    // Content
    const marker = new Mark(document.getElementById("__markdown-content")!);
    // Keydown listener
    window.addEventListener("keydown", (keyboardEvent) => {
        // Hide search box
        if (keyboardEvent.key === "Escape") {
            if (findWidget.isOpen) {
                findWidget.close();
            }
        }
        // Show & focus search box
        else if ((keyboardEvent.key === "f" || keyboardEvent.key === "F") && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) { // Ctrl+F
            if (!findWidget.isOpen) {
                findWidget.open();
            }
            findWidget.focus();
        }
    });
    // Input changed in search box
    findWidget.onInputChanged((type: string, options: AddEventListenerOptions) => {
        findInPage(findWidget, marker, type, options);
    });
});

// On message
window.addEventListener('message', (messageEvent) => {
    const message = messageEvent.data; // The JSON data our extension sent
    if (message.command === "scrollToTop") {
        document.getElementsByTagName('html')[0].scrollTop = 0; // embedded html is scrolled
    }
});

// Search in page
function findInPage(findWidget: FindWidget, marker: Mark, text: string, options) {
    marker.unmark({
        done() {
            // No input
            if (text === "") {
                findWidget.setResults([]);
                return;
            }
            // 
            const markOptions: MarkOptions = {
                done: numRes => {
                    const results = Array.from(document.querySelectorAll("mark"));
                    findWidget.setResults(results);
                }
            };
            // Highlight regular expression
            if (options.useRegexp) {
                try {
                    const re = new RegExp(text, options.matchCase ? "gm" : "gmi");
                    marker.markRegExp(re, markOptions);
                }
                catch (err) {
                    findWidget.setResults([]);
                    findWidget.regexpError(err);
                }
            }
            // Highlight text terms
            else {
                markOptions.caseSensitive = options.matchCase;
                marker.mark(text, markOptions);
            }
        }
    });

}

// Create find widget and bind search box
class FindWidget {
    rootDiv: HTMLElement | null;
    searchInput: HTMLElement | null;
    resultSpan: HTMLElement | null;
    noResultText: string;
    optCaseSensitiveIcon: HTMLElement | null;
    optRegexIcon: HTMLElement | null;
    prevResultIcon: HTMLElement | null;
    nextResultIcon: HTMLElement | null;
    closeIcon: HTMLElement | null;
    results: HTMLElement[];
    resultIdx: number;
    currentResult: HTMLElement | undefined;
    constructor() {
        this.rootDiv = document.getElementById("__find");
        this.searchInput = document.getElementById("__input");
        this.resultSpan = document.getElementById("__result");
        this.noResultText = this.resultSpan?.textContent || '...';
        this.optCaseSensitiveIcon = document.getElementById("__caseSensitive");
        this.optRegexIcon = document.getElementById("__regex");
        this.prevResultIcon = document.getElementById("__prevResult");
        this.nextResultIcon = document.getElementById("__nextResult");
        this.closeIcon = document.getElementById("__close");
        this.results = [];
        this.resultIdx = 1;
        this.currentResult = undefined;
        this.setup();
    }
    // Add specific listeners to search box
    setup() {
        // div.#__find
        //document.getElementsByTagName("body")[0].append(this.rootDiv);
        //
        (this.closeIcon as HTMLElement).onclick = (pointerEvent) => {
            this.close();
        };
        //
        (this.optRegexIcon as HTMLElement).onclick = (this.optCaseSensitiveIcon as HTMLElement).onclick = (pointerEvent) => {
            (pointerEvent.currentTarget as HTMLElement).classList.toggle("active");
            this.focus();
            (this.searchInput as HTMLInputElement).dispatchEvent(new Event("input"));
        };
        (this.nextResultIcon as HTMLElement).onclick = (pointerEvent) => {
            this.jumpToResult(this.resultIdx + 1);
        };
        (this.prevResultIcon as HTMLElement).onclick = (pointerEvent) => {
            this.jumpToResult(this.resultIdx - 1);
        };
        (this.searchInput as HTMLInputElement).onkeydown = (keyboardEvent) => {
            if (keyboardEvent.key === "Enter") {
                const delta = keyboardEvent.shiftKey ? -1 : 1;
                this.jumpToResult(this.resultIdx + delta);
            }
        };
        (this.rootDiv as HTMLDivElement).ontransitionend = (transitionEvent) => {
            if ((this.rootDiv as HTMLDivElement).classList.contains("closed")) {
                this.reset();
            }
        };
    }
    // Get visibility status of search box
    get isOpen() {
        return (this.rootDiv as HTMLDivElement).classList.contains("open");
    }
    // Show search box
    open() {
        const classes = (this.rootDiv as HTMLDivElement).classList;
        classes.remove("closed");
        classes.add("open");
    }
    // Show search box in initial state (no results)
    reset() {
        (this.searchInput as HTMLInputElement).value = "";
        (this.searchInput as HTMLInputElement).dispatchEvent(new Event("input"));
        (this.nextResultIcon as HTMLElement).classList.add("disabled");
        (this.prevResultIcon as HTMLElement).classList.add("disabled");
        this.results = [];
        this.jumpToResult(0); // will clear result text
    }
    // Hide search box
    close() {
        const classes = (this.rootDiv as HTMLDivElement).classList;
        classes.add("closed");
        classes.remove("open");
    }
    // Focus search box
    focus() {
        (this.searchInput as HTMLInputElement).focus();
    }
    // Manage search text
    onInputChanged(listener) {
        (this.searchInput as HTMLInputElement).addEventListener("input", (inputEvent) => {
            listener((this.searchInput as HTMLInputElement).value, {
                matchCase: (this.optCaseSensitiveIcon as HTMLElement).classList.contains("active"),
                useRegexp: (this.optRegexIcon as HTMLElement).classList.contains("active")
            });
        });
    }
    // Update seach fox icons and results navigation
    setResults(results: HTMLElement[]) {
        this.results = results;
        (this.rootDiv as HTMLDivElement).classList.remove("error");
        this.jumpToResult(0);
        if (results.length > 1) {
            (this.nextResultIcon as HTMLElement).classList.remove("disabled");
            (this.prevResultIcon as HTMLElement).classList.remove("disabled");
        }
        else {
            (this.nextResultIcon as HTMLElement).classList.add("disabled");
            (this.prevResultIcon as HTMLElement).classList.add("disabled");
        }
    }
    // Go to result item by number
    jumpToResult(idx: number) {
        if (idx < 0) {
            idx = this.results.length - 1;
        }
        else if (idx >= this.results.length) {
            idx = 0;
        }
        this.resultIdx = idx;
        this.currentResult?.classList.remove("current");
        if (this.results.length > 0) {
            this.currentResult = this.results[idx];
            this.currentResult.scrollIntoView();
            this.currentResult.classList.add("current");
            //(this.resultSpan as HTMLSpanElement).textContent = l10n.t("{0} of {1}",this.resultIdx + 1, this.results.length);
            (this.resultSpan as HTMLSpanElement).textContent = `${this.resultIdx + 1} / ${this.results.length}`;
        }
        else {
            //(this.resultSpan as HTMLSpanElement).textContent = l10n.t("No Result");
            (this.resultSpan as HTMLSpanElement).textContent = this.noResultText;
            this.currentResult = undefined;
        }
    }
    // Invalid regex
    regexpError(err) {
        (this.rootDiv as HTMLDivElement).classList.add("error");
    }
}
