export interface Document {
    markdownContent:Buffer
     // some kind of functionality would be beneficial to query the first few paragraphs of a heading
}

export interface Heading {
    level: number
    title: string
    // todo: probably a location, or some kind of id is also needed so we can jump straight to it
   
}