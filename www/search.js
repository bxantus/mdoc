// `vscode` is already requested in viewer.js
window.addEventListener('load', () => {
    const input = document.getElementById("searchinput")
    input.oninput = (inputEvent) => {
        const query = inputEvent.target.value
        vscode.postMessage({
            command: "search",
            query
        })
    }
    input.focus()

})

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.command == "searchResults") {
        const resultsDiv = document.getElementById("results")
        resultsDiv.textContent = "" // clear contents

        for (const res of message.results) {
            resultsDiv.insertAdjacentHTML("beforeend", `<a href="${res.url}"><h2>${res.title}</h2></a>`)
            resultsDiv.insertAdjacentHTML("beforeend", res.content)
        }
    } if (message.command == "searchProgress") {
        // update progress display (ex. index)
    }
})