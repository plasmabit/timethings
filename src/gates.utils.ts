import { TFile, } from "obsidian";
import * as BOMS from "./BOMS";

export interface FilterList {
    folders: string[];
    tags: string[];
    frontmatter: {
        [field: string]: string[],
    };
}

export function isFileMatchFilter(file: TFile, filter: FilterList,): boolean {
    // Check if file matches paths
    if (isStringInList(file.parent.path, filter.folders)) {
        return true;
    }
    // Check if file matches tags
    
    // Check if file matches frontmatter
    return false;
}

export function isStringInList(path: string, list: string[]): boolean {
    return list.includes(path);
}

export async function isTagPresentInFile(file: TFile, tag: string,) {
    await this.app.fileManager.processFrontMatter(
        file as TFile,
        (frontmatter) => {
            const updateKeyValue = BOMS.getValue(frontmatter, "tags");
            if (updateKeyValue.includes(tag))
            {
                return true;
            }
        },
    );
    return false;
}