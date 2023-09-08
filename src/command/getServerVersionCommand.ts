import * as vscode from 'vscode';

import { type Uri } from 'vscode';
import { AuthenticationService } from '../service/authenticationService';
import { SPFileService } from '../service/spFileService';
import { type ICommand, type IConfig } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { FileHelper } from '../util/fileHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';
import { UrlHelper } from '../util/urlHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

/*
 *
 */
export class GetServerVersionCommand implements ICommand {
    /**
     *
     * @param {vscode.Uri} resourcePath - Optional filepath (Uses current editor if not given)
     * @param {boolean} absolute - Option to copy the absolute path (defaults to SPGo Config)
     */
    execute(fileUri: Uri, _props?: any): Thenable<any> {
        try {
            const fileName: string = FileHelper.getFileName(fileUri);

            return UiHelper.showStatusBarProgress(
                `Getting server version for:  ${fileName}`,
                vscode.window.spgo
                    .initialize(fileUri)
                    .then((config: IConfig) => {
                        Logger.outputMessage(
                            `Getting server version for:  ${fileName}`,
                            vscode.window.spgo.outputChannel
                        );

                        return AuthenticationService.verifyCredentials(vscode.window.spgo, config, fileUri)
                            .then(async (fileUri: Uri) => await this.getServerFiles(config, fileUri))
                            .then(() => {
                                Logger.updateStatusBar('File Download Complete.', 5);
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

    public async getServerFiles(config: IConfig, fileUri: Uri): Promise<any> {
        const fileService: SPFileService = new SPFileService(config);
        const sharePointFileUri: Uri = UrlHelper.getServerRelativeFileUri(fileUri.fsPath, config);
        const siteUri: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(sharePointFileUri.toString(), config);
        if (FileHelper.isPathFile(fileUri)) {
            // Get a single file
            return await fileService.downloadFileMajorVersion(fileUri, config.sourceRoot);
        } else {
            // User wants to download a full folder.
            let folderPath: string = sharePointFileUri.toString().replace(siteUri.toString(), '');
            folderPath = UrlHelper.normalizeSlashes(folderPath);

            return await fileService.downloadFiles(siteUri, folderPath + '/**/*');
        }
    }
}
