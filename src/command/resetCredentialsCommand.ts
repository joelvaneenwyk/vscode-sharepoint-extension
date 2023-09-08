import * as vscode from 'vscode';

import { type Uri } from 'vscode';
import { CredentialDao } from '../dao/credentialDao';
import { AuthenticationService } from '../service/authenticationService';
import { type ICommand, type IConfig } from '../spgo';
import { ErrorHelper } from '../util/errorHelper';
import { Logger } from '../util/logger';
import { UiHelper } from '../util/uiHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

/*
 *
 */
export class ResetCredentialsCommand implements ICommand {
    /**
     *
     * @param {vscode.Uri} resourcePath - Optional filepath (Uses current editor if not given)
     * @param {boolean} absolute - Option to copy the absolute path (defaults to SPGo Config)
     */
    execute(_fileUri: Uri, _props?: any): Thenable<any> {
        try {
            return UiHelper.showStatusBarProgress(
                `Resetting User Credentials...`,
                WorkspaceHelper.getActiveWorkspaceUri()
                    .then(async (activeWorkspace) => await vscode.window.spgo.initialize(activeWorkspace))
                    .then((config: IConfig) => {
                        vscode.window.spgo.credentials = null;

                        // clear stored credentials
                        if (config.storeCredentials) {
                            CredentialDao.deleteCredentials(config.sharePointSiteUrl);
                        }

                        return AuthenticationService.verifyCredentials(vscode.window.spgo, config).then(() => {
                            Logger.outputMessage('User Credentials Reset.', vscode.window.spgo.outputChannel);
                            Logger.updateStatusBar('User Credentials Reset.', 5);
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
