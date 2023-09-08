import * as vscode from 'vscode';

import { type Uri } from 'vscode';
import { Constants } from '../constants';
import { AuthenticationService } from '../service/authenticationService';
import { SPFileService } from '../service/spFileService';
import { type ICommand, type IConfig, type IPublishingAction } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

/*
 *
 */
export class PublishWorkspaceCommand implements ICommand {
    /**
     *
     * @param {vscode.Uri} resourcePath - Optional filepath (Uses current editor if not given)
     * @param {boolean} absolute - Option to copy the absolute path (defaults to SPGo Config)
     */
    execute(_fileUri: Uri, _props?: any): Thenable<any> {
        try {
            return UiHelper.showStatusBarProgress(
                'Publishing workspace',
                WorkspaceHelper.getActiveWorkspaceUri()
                    .then(async (activeWorkspace) => await vscode.window.spgo.initialize(activeWorkspace))
                    .then((config: IConfig) => {
                        const publishingInfo: IPublishingAction = {
                            contentUri: null,
                            scope: Constants.PUBLISHING_MAJOR,
                            message: config.checkInMessage || Constants.PUBLISHING_DEFAULT_MESSAGE
                        };
                        Logger.outputMessage('Starting Workspace Publish...', vscode.window.spgo.outputChannel);
                        const fileService: SPFileService = new SPFileService(config);

                        return AuthenticationService.verifyCredentials(vscode.window.spgo, config, publishingInfo)
                            .then((publishingInfo) => UiHelper.getPublishingMessage(publishingInfo))
                            .then(async (publishingInfo) => await fileService.publishWorkspace(publishingInfo))
                            .then(() => {
                                Logger.updateStatusBar('Workspace Publish complete.', 5);
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
}
