import * as os from 'os'
import {promises as fs, watch as fsWatch, watch} from 'fs'
import * as vscode from 'vscode'
import { Disposable, EventEmitter } from 'vscode'

interface ProjectEntry {
    uri: string // source adapters may be constructed based on uri scheme, if any
}

interface ProjectSettings {
    projects: ProjectEntry[]
}

class DocProjects {
    projectsDir:string = "<unitialized>";
    projects:ProjectSettings = { projects: [] }
    #projectsWatch:Disposable|undefined
    #projectsChanged = new EventEmitter<ProjectSettings>()

    async init() {
        this.projectsDir = `${os.homedir()}/.mdoc`
        // create dir if not exists
        await fs.mkdir(this.projectsDir, {recursive: true})
        const loaded = await this.load()
        if (loaded && !this.#projectsWatch) {
            let processingChange = false
            const watcher = fsWatch(`${this.projectsDir}/projects.json`, undefined, async event => {
                if (event == "change" && !processingChange) { // guard against multiple changes while loading
                    processingChange = true
                    const oldProjects = this.projects
                    await this.load() // NOTE: this may be triggered from our own actions
                    // check if there is any change
                    let changed = oldProjects.projects.length != this.projects.projects.length
                    if (!changed) {
                        for (let i = 0; i < this.projects.projects.length; ++i) {
                            if (this.projects.projects[i].uri != oldProjects.projects[i].uri) {
                                changed = true;
                                break;
                            }

                        }
                    }
                    if (changed)
                        this.#projectsChanged.fire(this.projects)
                    processingChange = false
                }
            })
            this.#projectsWatch = { dispose() { watcher.close() }}
        }
    }

    get projectsChanged() { return this.#projectsChanged.event }

    dispose() {
        this.#projectsWatch?.dispose()
        this.#projectsChanged.dispose()
    }

    private async load() {
        try {
            const buf = await fs.readFile(`${this.projectsDir}/projects.json`)
            this.projects = JSON.parse(buf.toString()) as ProjectSettings
            return true    
        } catch (ex) {
            // projects.json does not exist yet
            return false
        }
    }

    addProject(proj:ProjectEntry) {
        this.projects.projects.push(proj)
        this.scheduleSave()
    }

    removeProject(uri:string) {
        const projIdx = this.projects.projects.findIndex(proj => proj.uri == uri)
        if (projIdx >= 0) {
            this.projects.projects.splice(projIdx, 1)
            this.scheduleSave()
        }
    }

    #saveTimeout:NodeJS.Timeout|undefined

    scheduleSave() {
        if (!this.#saveTimeout)
            this.#saveTimeout = setTimeout(() => {
                this.#saveTimeout = undefined
                this.saveProjects()
            }, 500)
    }

    private async saveProjects() {
        try {
            await fs.writeFile(`${this.projectsDir}/projects.json`, JSON.stringify(this.projects, undefined, 4))
        } catch (ex) {
            const choice = await vscode.window.showErrorMessage(`mdoc couldn't save 'projects.json'`, "Retry")
            if (choice == "Retry") {
                this.scheduleSave()
            }
        }
    }
}


export const docProjects = new DocProjects;