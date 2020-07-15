# mdoc 

mdoc is a markdown documentation viewer. It supports markdown "projects", hosted in git repositories.

A project needs an `index.md` file for its table of contents to appear in the documentation panel.   
The projects name will be inferred from the first level 1 heading in `index.md`. The opening page for the project is `README.md`, as usual for git repositories.

## Features

- Projects panel with the structure of a documentation project (generated from `index.md`)
- Auto generated table of contents for markdown files
- Support for linking to markdown files in external documentations (raw git url is needed)
- Auto update project panel and the currently opened document on changes
- Full text search for all documents listed in `index.md`, powered by [lunr](https://lunrjs.com/)


## Known Issues

- git documentation project repositories aren't refreshed yet automatically. You can use the **Refresh project** command for a manual refresh
- After refreshing a project, search index won't be rebuilt, and search won't use the new content
- Projects cannot yet be removed, using the user interface

