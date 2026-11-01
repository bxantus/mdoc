import { promises as fs } from "fs";
import * as path from "path";
import MarkdownIt from "markdown-it";
import { l10n } from "vscode";

let helpContent: Promise<string> | string | undefined;
// read and compile searcHelp.md
export async function getSearchHelpInHtml(extensionPath: string) {
    if (!helpContent) {
        helpContent = compileSearchHelpInHtml(path.join(extensionPath, "resources", l10n.t("searchHelp.md")));
    }
    return helpContent;
}

async function compileSearchHelpInHtml(path: string) {
    const helpBuff = await fs.readFile(path);
    const md = new MarkdownIt;
    return md.render(helpBuff.toString());
}

// later highlighting of search results, and other search helper functionalities may be moved here