export default function slugify(s:string, uniqueSlugs:Map<string, number>) {
    let slug = encodeURIComponent(s.trim().toLowerCase().replace(/\s+/g, '-'))
    let counter = uniqueSlugs.get(slug) // counter for uniqueness
    if (counter != undefined) { // not unique
        counter++ // get next number for uniqueness (first will be 2)
        uniqueSlugs.set(slug, counter) // store new unique suffix
        slug = `${slug}-${counter}`
    } else {
        uniqueSlugs.set(slug, 1)
    }
    return slug
} 