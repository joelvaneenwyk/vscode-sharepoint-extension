import * as fs from 'fs-extra';
import * as vscode from 'vscode';

import { type Uri } from 'vscode';
import { Constants } from '../constants';
import { AuthenticationService } from '../service/authenticationService';
import { SPFileService } from '../service/spFileService';
import { type ICommand, type IConfig } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { FileHelper } from '../util/fileHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';

/*
 *
 */
export class DeleteFileCommand implements ICommand {
    /**
     * Checks out the currently selected file from SharePoint
     * @param {vscode.Uri} fileUri - Optional filepath (Uses current editor if not given)
     * @param {boolean?} props - Optional properties for this command
     */
    execute(fileUri: Uri, _props?: any): Thenable<any> {
        try {
            const fileName: string = FileHelper.getFileName(fileUri);

            return UiHelper.showStatusBarProgress(
                `Deleting file:  ${fileName}`,
                vscode.window.spgo
                    .initialize(fileUri)
                    .then((config: IConfig) => {
                        // is this a directory?
                        if (fs.lstatSync(fileUri.fsPath).isDirectory()) {
                            Logger.showWarning('The delete file command only works for single files at this time.');
                        } else {
                            if (fileUri.fsPath.includes(config.sourceRoot)) {
                                const fileName: string = FileHelper.getFileName(fileUri);
                                const fileService: SPFileService = new SPFileService(config);

                                return AuthenticationService.verifyCredentials(
                                    vscode.window.spgo,
                                    config,
                                    fileUri
                                ).then((fileUri) => {
                                    Logger.outputMessage(
                                        `Deleting file  ${fileUri.fsPath} from server.`,
                                        vscode.window.spgo.outputChannel
                                    );

                                    return vscode.window
                                        .showWarningMessage(
                                            `Are you sure you want to delete ${fileName} from the server?`,
                                            Constants.OPTIONS_YES,
                                            Constants.OPTIONS_NO
                                        )
                                        .then(async (result) => {
                                            if (result == Constants.OPTIONS_YES) {
                                                await fileService
                                                    .deleteFileFromServer(fileUri)
                                                    .then(() => {
                                                        Logger.outputMessage(
                                                            'Remote file delete complete.',
                                                            vscode.window.spgo.outputChannel
                                                        );
                                                    })
                                                    .then(() => {
                                                        fs.remove(fileUri.fsPath).then(() => {
                                                            Logger.outputMessage(
                                                                'Local file delete complete.',
                                                                vscode.window.spgo.outputChannel
                                                            );
                                                            Logger.updateStatusBar('File Deletion Complete.', 5);
                                                        });
                                                    });
                                            } else {
                                                Logger.outputMessage(
                                                    'Delete operation cancelled.',
                                                    vscode.window.spgo.outputChannel
                                                );
                                                Logger.updateStatusBar('File Delete Cancelled.', 5);
                                            }
                                        });
                                });
                            }
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
