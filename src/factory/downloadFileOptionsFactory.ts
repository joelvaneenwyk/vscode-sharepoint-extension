import * as globToRegExp from 'glob-to-regexp';
import * as parseGlob from 'parse-glob';

import { type ISPPullOptions } from 'sppull';
import { type Uri } from 'vscode';
import { type IConfig } from '../spgo';
import { FileHelper } from '../util/fileHelper';
import { UrlHelper } from '../util/urlHelper';

export class DownloadFileOptionsFactory {
    public glob: any;

    constructor(path: string) {
        this.glob = parseGlob(path);
    }

    public createFileOptions(siteUrl: Uri, config: IConfig): ISPPullOptions {
        const dlRootFolder: string = FileHelper.ensureCorrectPathSeparator(
            config.sourceRoot + siteUrl.toString().replace(config.sharePointSiteUrl, '')
        );
        const options: ISPPullOptions = {
            spBaseFolder: UrlHelper.ensureLeadingWebSlash(siteUrl.path),
            dlRootFolder
        };
        const globPattern: string =
            options.spBaseFolder === '/' ? this.glob.orig : options.spBaseFolder + this.glob.orig;

        if (this.glob.is.glob) {
            options.spRootFolder = this.glob.base.replace('/**/', '/');
            options.fileRegExp = globToRegExp(globPattern, {
                flags: 'i',
                globstar: this.glob.is.globstar,
                extended: this.glob.orig.indexOf('|') >= 0
            });
        } else {
            options.spRootFolder = UrlHelper.formatWebFolder(this.glob.orig);
        }

        options.recursive = this.glob.is.globstar;
        options.createEmptyFolders = false;

        return options;
    }
}
