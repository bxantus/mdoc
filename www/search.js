let searchId = 0

// `vscode` is already requested in viewer.js
window.addEventListener('load', () => {
    const input = document.getElementById("searchinput")
    input.oninput = (inputEvent) => {
        const query = inputEvent.target.value
        vscode.postMessage({
            command: "search",
            query,
            searchId
        })
    }
    input.focus()

    searchId = parseInt(input.getAttribute("data-searchId"))
    console.log("searchId: ", searchId)
})

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.command == "searchResults") {
        const resultsDiv = document.getElementById("results")
        resultsDiv.textContent = "" // clear contents

        for (const res of message.results) {
            resultsDiv.insertAdjacentHTML("beforeend", `<a href="${res.url}"><h2>${res.title}</h2></a>`)
            resultsDiv.insertAdjacentHTML("beforeend", `<p class="detail" >${res.content}</p>`)
        }
    } if (message.command == "searchProgress") {
        // update progress display (ex. index)
    }
})