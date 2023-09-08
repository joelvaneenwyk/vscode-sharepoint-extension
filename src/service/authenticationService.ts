import * as vscode from 'vscode';

import { Constants } from '../constants';
import { CredentialDao } from '../dao/credentialDao';
import { type IAppManager, type IConfig } from '../spgo';
import { Logger } from '../util/logger';
import { RequestHelper } from '../util/requestHelper';

export class AuthenticationService {
    // Performs Three checks:
    // 1. are the current in-memory credentials valid?
    // 2. If not:
    // 2a. Get new credentials (Username + Password)
    // 2b. Validate User credentials
    // 2c. Fail if new credentials are valid
    // 3. Continue to execute the promise object provided.
    static verifyCredentials(appManager: IAppManager, config: IConfig, payload?: any): Thenable<any> {
        appManager = appManager || vscode.window.spgo;
        // let config : IConfig = workspaceConfig;

        try {
            if (!appManager.credentials) {
                appManager.credentials = {};
                if (config.authenticationType && config.authenticationType === Constants.SECURITY_ADDIN) {
                    return getClientId(appManager)
                        .then(async (mgr: IAppManager) => await getClientSecret(mgr))
                        .then(async (mgr: IAppManager) => await getRealm(mgr))
                        .then(async (mgr: IAppManager) => await verify(mgr))
                        .then(async (mgr: IAppManager) => await processNextCommand(mgr));
                } else {
                    return getUserName(appManager)
                        .then(async (mgr: IAppManager) => await getPassword(mgr))
                        .then(async (mgr: IAppManager) => await verify(mgr))
                        .then(async (mgr: IAppManager) => await processNextCommand(mgr));
                }
            } else {
                return processNextCommand(appManager);
            }
        } catch (err) {
            Logger.outputError(err, vscode.window.spgo.outputChannel);
            appManager.credentials = {};
        }

        // take user's SharePoint username input
        function getClientId(appManager: IAppManager) {
            // return new Promise((resolve, reject) => {
            const options: vscode.InputBoxOptions = {
                ignoreFocusOut: true,
                placeHolder: '<client Id>',
                value: appManager.credentials.clientId || '',
                prompt: 'Please enter the Client Id for this extension'
            };
            return vscode.window.showInputBox(options).then((result) => {
                appManager.credentials.clientId = result || appManager.credentials.clientId || '';
                if (!appManager.credentials.clientId) {
                    // reject('No ClientId');
                    appManager.credentials = null;
                }
                return appManager; // resolve(appManager);
            });
            //	});
        }

        // take user's SharePoint username input
        async function getClientSecret(appManager: IAppManager) {
            return await new Promise((resolve, reject) => {
                const options: vscode.InputBoxOptions = {
                    ignoreFocusOut: true,
                    password: true,
                    placeHolder: '<client secret>',
                    value: appManager.credentials.clientSecret || '',
                    prompt: 'Please enter the Client Secret for this extension'
                };
                vscode.window.showInputBox(options).then((result) => {
                    appManager.credentials.clientSecret = result || appManager.credentials.clientSecret || '';
                    if (!appManager.credentials.clientSecret) {
                        reject('No Client Secret');
                        appManager.credentials = null;
                    }
                    resolve(appManager);
                });
            });
        }

        // take user's SharePoint username input
        async function getRealm(appManager: IAppManager) {
            return await new Promise((resolve /*, reject */) => {
                const options: vscode.InputBoxOptions = {
                    ignoreFocusOut: true,
                    placeHolder: '<realm>',
                    value: appManager.credentials.realm || '',
                    prompt: '(Optional) Please enter the Realm for this extension'
                };
                vscode.window.showInputBox(options).then((result) => {
                    appManager.credentials.realm = result || appManager.credentials.realm || '';
                    // if (!appManager.credentials.realm) {
                    // 	reject('No Realm');
                    // 	appManager.credentials = null;
                    // };
                    resolve(appManager);
                });
            });
        }

        // take user's SharePoint username input
        async function getUserName(appManager: IAppManager) {
            return await new Promise((resolve, reject) => {
                const options: vscode.InputBoxOptions = {
                    ignoreFocusOut: true,
                    placeHolder: 'user@domain.com [or domain\\user]',
                    value: appManager.credentials.username || '',
                    prompt: 'Please enter your SharePoint username'
                };
                vscode.window.showInputBox(options).then((result) => {
                    appManager.credentials.username = result || appManager.credentials.username || '';
                    if (!appManager.credentials.username) {
                        reject('No Username');
                        appManager.credentials = null;
                    }
                    resolve(appManager);
                });
            });
        }

        // take user's password input
        async function getPassword(appManager: IAppManager) {
            return await new Promise((resolve, reject) => {
                const options: vscode.InputBoxOptions = {
                    ignoreFocusOut: true,
                    password: true,
                    value: appManager.credentials.password || '',
                    placeHolder: 'password',
                    prompt: 'Please enter your SharePoint password'
                };
                return vscode.window.showInputBox(options).then((result: string) => {
                    appManager.credentials.password = result || appManager.credentials.password || '';
                    if (!appManager.credentials.password) {
                        reject('No Password');
                        appManager.credentials = null;
                    }
                    resolve(appManager);
                });
            });
        }

        // Test the new credential set to make sure it is valid
        async function verify(appManager: IAppManager) {
            return await new Promise((resolve, reject) => {
                const spr = RequestHelper.createRequest(appManager, config);

                spr.requestDigest(config.sharePointSiteUrl).then(
                    () => {
                        // response => {
                        // store credentials?
                        if (config.storeCredentials) {
                            // } && config.authenticationType !== Constants.SECURITY_ADDIN){
                            CredentialDao.setCredentials(config.sharePointSiteUrl, appManager.credentials);
                        }
                        resolve(appManager);
                    },
                    (err) => {
                        appManager.credentials = null;
                        reject(err);
                    }
                );
            });
        }

        // Authentication was successful, process the command provided by the caller.
        async function processNextCommand(appManager: IAppManager) {
            return await new Promise((resolve, reject) => {
                if (appManager && appManager.credentials) {
                    resolve(payload);
                } else {
                    reject('null credentials.');
                }
            });
        }
    }
}
