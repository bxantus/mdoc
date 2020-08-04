/// if text is wrapped inside backticks, it will be encoded in an extra code block
/// also surronding backtick pairs will be removed
export function sanitizeCodeFence(text:string) {
    let tickIdx = text.indexOf("`") // todo: could have wrapping using double ticks as well, if this is the case endIdx will be double ticked as well
    let parts:string[] = []
    let lastEdit = 0 // last edit index
    while (tickIdx >= 0) {
        const endIdx = text.indexOf("`", tickIdx + 1)
        if (endIdx > tickIdx) {
            // replace part with <code>
            parts.push(sanitizeHtml(text.substring(lastEdit, tickIdx)), "<code>", sanitizeHtml(text.substring(tickIdx + 1, endIdx)), "</code>")
            lastEdit = endIdx + 1
            tickIdx = text.indexOf("`", endIdx + 1) // go over to the next tick
        } else break;
    }
    if (parts.length == 0)
        return sanitizeHtml(text)
    else {
        parts.push(text.substring(lastEdit)) // add last chunk
        return parts.join('')
    }
}

function sanitizeHtml(text:string) {
    // replace '<' and '>' with &lt; and &gt;
    return text.replace(/<|>/g, s => s == "<" ? "&lt;" : "&gt;")
}