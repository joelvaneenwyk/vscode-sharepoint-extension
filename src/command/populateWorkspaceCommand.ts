import * as vscode from 'vscode';

import { Uri } from 'vscode';
import { AuthenticationService } from '../service/authenticationService';
import { SPFileService } from '../service/spFileService';
import { type ICommand, type IConfig, type IError } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';
import { UrlHelper } from '../util/urlHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

/*
 *
 */
export class PopulateWorkspaceCommand implements ICommand {
    /**
     *
     * @param {vscode.Uri} resourcePath - Optional filepath (Uses current editor if not given)
     * @param {boolean} absolute - Option to copy the absolute path (defaults to SPGo Config)
     */
    execute(_fileUri: Uri, _props?: any): Thenable<any> {
        try {
            return UiHelper.showStatusBarProgress(
                'Populating Workspace',
                WorkspaceHelper.getActiveWorkspaceUri()
                    .then(async (activeWorkspace) => await vscode.window.spgo.initialize(activeWorkspace))
                    .then((config: IConfig) => {
                        return AuthenticationService.verifyCredentials(vscode.window.spgo, config).then(async () => {
                            await this.downloadFiles(config).then(() => {
                                Logger.updateStatusBar('File Download Complete.', 5);
                            });
                        });
                    })
                    .catch((err) => {
                        ErrorHelper.handleError(err);
                    })
            );
        } catch (err) {
            ErrorHelper.handleError(err, true);
        }
    }

    public async downloadFiles(config: IConfig): Promise<any> {
        return await new Promise((resolve, reject) => {
            const fileService: SPFileService = new SPFileService(config);
            Logger.outputMessage('Starting File Synchronization...', vscode.window.spgo.outputChannel);

            // TODO: refactor to support subsites with remoteFolders property even if no remoteFolders property exists on the parent site
            if (config.remoteFolders) {
                // add all files from the Root Site to the downloads collection
                const downloads: Array<Promise<any>> = [];

                for (const path of config.remoteFolders) {
                    if (UrlHelper.isFile(path)) {
                        downloads.push(
                            fileService.downloadFileMajorVersion(
                                Uri.file(config.sourceRoot + UrlHelper.normalizeSlashes(path)),
                                config.sourceRoot
                            )
                        );
                    } else {
                        downloads.push(fileService.downloadFiles(Uri.parse(config.sharePointSiteUrl), decodeURI(path)));
                    }
                }

                if (config.subSites && config.subSites.length > 0) {
                    // add all files from the specified SubSites to the downloads collection
                    for (const subSite of config.subSites) {
                        for (const folder of subSite.remoteFolders) {
                            downloads.push(
                                fileService.downloadFiles(Uri.parse(subSite.sharePointSiteUrl), decodeURI(folder))
                            );
                        }
                    }
                }

                // Download the files
                Promise.all(downloads).then(() => {
                    Logger.outputMessage(`file synchronization complete.`, vscode.window.spgo.outputChannel);
                    resolve(`file synchronization complete.`);
                });
            } else {
                const error: IError = {
                    message: '"remoteFolders":[string] property not configured in workspace configuration file.'
                };
                Logger.showError(error.message, error);
                reject(error);
            }
        });
    }
}
