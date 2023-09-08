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

/*
 *
 */
export class SaveFileCommand implements ICommand {
    /**
     * Checks out the currently selected file from SharePoint
     * @param {vscode.Uri} fileUri - Optional filepath (Uses current editor if not given)
     * @param {boolean?} _props - Optional properties for this command
     */
    execute(fileUri: Uri, _props?: any): Thenable<any> {
        try {
            const fileName: string = FileHelper.getFileName(fileUri);

            return UiHelper.showStatusBarProgress(
                `Saving file:  ${fileName}`,
                vscode.window.spgo
                    .initialize(fileUri)
                    .then((config: IConfig) => {
                        if (fileUri.fsPath.includes(config.sourceRoot)) {
                            const fileService: SPFileService = new SPFileService(config);

                            const publishAction: IPublishingAction = {
                                contentUri: fileUri.fsPath,
                                scope: null,
                                message: config.checkInMessage || Constants.PUBLISHING_DEFAULT_MESSAGE
                            };

                            return AuthenticationService.verifyCredentials(vscode.window.spgo, config, publishAction)
                                .then(async (publishAction) => await fileService.uploadFilesToServer(publishAction))
                                .then(() => {
                                    Logger.outputMessage(`File saved successfully`);
                                    Logger.updateStatusBar('File saved.', 5);
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
