import * as os from 'os'
import {promises as fs} from 'fs'
import * as vscode from 'vscode'

interface ProjectEntry {
    uri: string // source adapters may be constructed based on uri scheme, if any
}

interface ProjectSettings {
    projects: ProjectEntry[]
}

class DocProjects {
    projectsDir:string = "<unitialized>";
    projects:ProjectSettings = { projects: [] }
    
    async init() {
        this.projectsDir = `${os.homedir()}/.mdoc`
        // create dir if not exists
        await fs.mkdir(this.projectsDir, {recursive: true})
        await this.load()
    }

    private async load() {
        try {
            const buf = await fs.readFile(`${this.projectsDir}/projects.json`)
            this.projects = JSON.parse(buf.toString()) as ProjectSettings
        } catch (ex) {
            // projects.json does not exist yet
        }
    }

    addProject(proj:ProjectEntry) {
        this.projects.projects.push(proj)
        this.scheduleSave()
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