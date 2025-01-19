/**
 * Joins parts of a path, taking care not to have to many separating `/` characters 
 */
export function joinPath(p1:string, ...parts:string[]):string  {
    let path = p1
    for (const p of parts) {
        if (path.endsWith('/') && p.startsWith('/'))
            path += p.substring(1)
        else if (path.endsWith('/') || p.startsWith('/'))
            path += p
        else path += '/' + p
    }
    return path
} 

/**
 * Normalizes path of mdoc URIs, meaning that:
 * * path won't start with `/` char, mdoc URIs are all relative to the repo root, no matter how the users have specified them
 * * also will decode special chars inside...
 */
export function normalizeMdocPath(path:string):string {
    if (path.startsWith('/')) path = path.substring(1)
    
    return decodeURIComponent(path)
}
