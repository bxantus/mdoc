import { QuickPick, QuickPickItem, window } from 'vscode'
import { allTreeItems, ProjectTree, SourceAdapter, TreeItemVal } from '../source/sourceAdapter'

interface Project {
    source: SourceAdapter
    projectTree:  ProjectTree
}

export async function showDocumentPicker(projects:Project[]) {
    const quickPick = new DocumentPicker(window.createQuickPick(), projects)
    return quickPick.show()
}

class DocumentItem implements QuickPickItem {
    get docUri():string { return this.treeItem.docUri as string }

    get label():string { return this.treeItem.label }
    get detail():string { return this._source.title }
    get source() { return  this._source }

    description:string
    constructor(private _source:SourceAdapter, private treeItem:TreeItemVal) {
        // compute path to root in description, like: uie docs/reference/sys modules. 
        let path:string[] = []
        for (let p = treeItem.parent; p && p.parent; p = p.parent) { // won't add root element to the path
            path.unshift(p.label)
        }
        this.description = path.join('/')   
    }
}

class DocumentPicker  {
    constructor(private quickPick:QuickPick<DocumentItem>, private projects:Project[]) {
        quickPick.placeholder = "Open document"
        for (const proj of projects)
            this.fillItemsFrom(proj)
    }

    show():Promise<DocumentItem|undefined> {
        return new Promise<DocumentItem|undefined>((resolve, reject) => {
            this.quickPick.show()
            let hideListener = this.quickPick.onDidHide( e => resolve(undefined))
            this.quickPick.onDidAccept( e => {
                hideListener.dispose()
                this.quickPick.hide()
                const selected = this.quickPick.selectedItems[0]
                resolve(selected)
            })
        })
    }

    private fillItemsFrom(proj:Project) {
        let items:DocumentItem[] = []
        for (const treeItem of allTreeItems(proj.projectTree, proj.source)) {
            if (treeItem.docUri)
                items.push(new DocumentItem(proj.source, treeItem))
        }
        this.quickPick.items = this.quickPick.items.concat(items)
    }
}