# Change Log

All notable changes to the "mdoc" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.4.0] - 2024-03-19
### Changed
- Synced syntax highliting in mdoc with vscode's latest. This is achieved by using the same CSS styles as vscode for markdown preview

### Fixed
- Fixed when clause for the `"mdoc.openSourceFromSidebar"` command. Because of this the command (_Open document source_) was 
  shown in the context menu for all custom treeviews

## [1.3.3] - 2022-02-09
## Added
- Support for non-markdown documents in links (also in `index.md`). These files will be opened with the associated vscode editor. 
This can become a handy feature to include interactive notebooks in your documentation project.  

## [1.3.2] - 2022-02-04
### Changed
- Better compatibility with [docsify](https://docsifyjs.netlify.app/#/): when `index.md` is used as a sidebar, you can use it both in docsify and mdoc.    
docsify doesn't support first level headings in sidebar md files. But mdoc relied on it to display the project's title.    
Now if you leave out this heading, mdoc will fall back to the repository's folder name. 

## [1.3.1] - 2021-08-31
### Fixed
- Find on page widget wasn't showing in newer versions of vscode (webViews have transitioned to use iframes, and the code relied on separate web pages)

## [1.3.0] - 2021-05-04
### Added
- Find on page feature: press `Ctrl+F` to open the Find Widget over the current page

## [1.2.1] - 2020-10-07
### Added
- Open document source command to document nodes in project tree. Project nodes have an additional item added, for opening the documentation index
- Document webview tab retains its position and state while hidden

## [1.2.0] - 2020-09-30
### Added
- Path for currently opened document is displayed at the top of documentation window. This can copied.
  - When such an URL is opened, the extension will handle it, and opens the document pointed at. Repositories are identified by their remote's (origin) url.
- `mdoc.open` command (by default is bound to `Ctrl+F1`). This displays a quick pick, where you can search among all the documents. You can insert URL copied from the document headers too (for ex. when you receive an mdoc link from someone)

## [1.1.1] - 2020-08-06
### Added
- Current search will appear in the project tree, to aid navigation between search and results
- Added documentation project management commands
  - remove project is available from project's context menu
  - add project commands are accessible in documentations view container's menu
- The extension's commands are given mdoc category in the command palette
- If projects change from another vscode instance, they will be refreshed in each other running vscode window

### Changed
- Better description in `README.md`, with examples using the Typescript Handbook for mdoc repository

### Fixed
- TOC generation supports headings containing inline code blocks, html tags and links
- Only refresh contents in the current panel, if the panel is visible. This avoids popping up the viewer panel, on document saves (if the same document was opened)
- Search index will be refreshed after a project is updated, or `index.md` changes

## [1.0.1] - 2020-07-15

### Added
- Initial release