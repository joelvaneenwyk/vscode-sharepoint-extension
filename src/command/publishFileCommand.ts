import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { type Uri } from 'vscode';
import { Constants } from '../constants';
import { AuthenticationService } from '../service/authenticationService';
import { SPFileService } from '../service/spFileService';
import { type ICommand, type IConfig, type IPublishingAction } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { FileHelper } from '../util/fileHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';
import { UrlHelper } from '../util/urlHelper';

/*
 *
 */
export class PublishFileCommand implements ICommand {
    /**
     * Checks out the currently selected file from SharePoint
     * @param {vscode.Uri} fileUri - Optional filepath (Uses current editor if not given)
     * @param {boolean?} props - Optional properties for this command
     */
    execute(fileUri: Uri, props?: any): Thenable<any> {
        try {
            const publishingScope: string = props;
            const fileName: string = FileHelper.getFileName(fileUri);

            return UiHelper.showStatusBarProgress(
                `Publishing ${publishingScope} file version:  ${fileName}`,
                vscode.window.spgo
                    .initialize(fileUri)
                    .then((config: IConfig) => {
                        if (fileUri.fsPath.includes(config.sourceRoot)) {
                            let publishingInfo: IPublishingAction = null;
                            const fileService: SPFileService = new SPFileService(config);

                            // is this a directory?
                            if (fs.lstatSync(fileUri.fsPath).isDirectory()) {
                                publishingInfo = {
                                    contentUri: fileUri.fsPath + path.sep + UrlHelper.osAwareGlobStar(),
                                    scope: publishingScope,
                                    message: config.checkInMessage || Constants.PUBLISHING_DEFAULT_MESSAGE
                                };
                            } else {
                                publishingInfo = {
                                    contentUri: fileUri.fsPath,
                                    scope: publishingScope,
                                    message: config.checkInMessage || Constants.PUBLISHING_DEFAULT_MESSAGE
                                };
                            }

                            Logger.outputMessage(
                                `Publishing ${publishingScope} file version:  ${fileUri.fsPath}`,
                                vscode.window.spgo.outputChannel
                            );

                            return AuthenticationService.verifyCredentials(vscode.window.spgo, config, publishingInfo)
                                .then((publishingInfo) => UiHelper.getPublishingMessage(publishingInfo))
                                .then(async (publishingInfo) => await fileService.uploadFilesToServer(publishingInfo))
                                .then(() => {
                                    Logger.outputMessage('File publish complete.', vscode.window.spgo.outputChannel);
                                    Logger.updateStatusBar('File Download Complete.', 5);
                                });
                        }
                    })
                    .catch((err) => {
                        ErrorHelper.handleError(err);
                    })
            );
        } catch (err) {
            ErrorHelper.handleError(err, true);
        }
    }
}
