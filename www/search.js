// `vscode` is already requested in viewer.js
window.addEventListener('load', () => {
    document.getElementById("searchbox").oninput = (inputEvent) => {
        const query = inputEvent.target.value
        vscode.postMessage({
            command: "search",
            query
        })
    }
})

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.command == "searchResults") {
        const resultsDiv = document.getElementById("results")
        resultsDiv.textContent = "" // clear contents

        for (const res of message.results) {
            const title = document.createElement("h2")
            title.textContent = res.title
            resultsDiv.append(title)
            resultsDiv.insertAdjacentHTML("beforeend", res.content)
        }
    } if (message.command == "searchProgress") {
        // update progress display (ex. index)
    }
})