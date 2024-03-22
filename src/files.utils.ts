import { TFile, } from "obsidian";

export function getFilesWithField(fieldName: string) : TFile []
{
    const cache = this.app.metadataCache;
    const files = this.app.vault.getMarkdownFiles();
    const filesWithField = [] as TFile [];
    for (const file of files)
    {
        const fileCache = cache.getFileCache(file);
        if (!fileCache || !fileCache.frontmatter) {
            continue;
        }
        if (fileCache.frontmatter[fieldName])
        {
            filesWithField.push(file);
        }
        //console.log(file.basename + " | " + fileCache.frontmatter[fieldName] + " seconds")
    }
    return filesWithField;
}