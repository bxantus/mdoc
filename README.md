# mdoc 

mdoc is an offline markdown documentation viewer. It supports markdown "projects", hosted in git repositories.   
You don't have to 'build' your documentation in static html pages, to be able to browse it.

mdoc provides a convenient way to open and browse your documentations inside vscode. Markdown files will be rendered on the fly when you open them (just like the builtin Markdown Preview does). mdoc contributes a new *Documentations* view container to the activity bar. This contains the tree structure of loaded projects.

All files will be opened in a viewer tab, you can pin it if you want, or can use it in split views.

A project needs an `index.md` file for its structure to appear in the documentation panel.   
The projects name will be inferred from the first level 1 heading in `index.md`. The opening page for the project is `README.md`, as usual for git repositories.

## Features

- Projects panel with the structure of a documentation project (generated from `index.md`)
- Auto generated table of contents for markdown files
- Support for linking to markdown files in external documentations (raw git url is needed)
- Auto update project panel and the currently opened document on changes
- Full text search for all documents listed in `index.md`, powered by [lunr](https://lunrjs.com/)


## Known Issues

- git documentation project repositories aren't refreshed yet automatically. You can use the **Update project** command for a manual refresh
- After updating a project, search index won't be rebuilt, and search won't use the new content
- Projects cannot yet be removed, using the user interface

