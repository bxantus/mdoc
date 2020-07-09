import { Disposable } from "vscode";

export default function dispose(...items:(Disposable|Disposable[]|undefined)[]) {
    for (const obj of items) {
        if (!obj) continue
        if (obj instanceof Disposable) {
            obj.dispose()
        } else {
            for (const d of obj)
                d.dispose()
        }
    }
}