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
 * * ensures that the path is absolute (starts with /)
 * * will decode special URI chars inside the path (like %20 for spaces)
 */
export function normalizeMdocPath(path:string):string {
    if (!path.startsWith('/'))
        path = '/' + path // make it absolute
    
    return decodeURIComponent(path)
}
