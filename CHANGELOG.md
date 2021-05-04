# Change Log

All notable changes to the "mdoc" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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