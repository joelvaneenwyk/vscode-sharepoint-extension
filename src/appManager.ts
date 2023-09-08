import * as fs from 'fs-extra';
import * as vscode from 'vscode';

import { Uri, type Memento } from 'vscode';
import { ConfigureWorkspaceCommand } from './command/configureWorkspaceCommand';
import { Constants } from './constants';
import { ConfigurationDao } from './dao/configurationDao';
import { CredentialDao } from './dao/credentialDao';
import { LocalStorageService } from './service/localStorageService';
import { type IAppManager, type ICommand, type IConfig, type ICredential, type IError } from './spgo';
import { Logger } from './util/logger';

export class AppManager implements IAppManager {
    public configSet: Map<string, IConfig>;
    public credentials: ICredential;
    public localStore: LocalStorageService;
    outputChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;

    constructor(storageContext: Memento) {
        this.configSet = new Map<string, IConfig>();
        this.credentials = null;
        this.localStore = new LocalStorageService(storageContext);
        this.outputChannel = vscode.window.createOutputChannel(Constants.OUTPUT_CHANNEL_NAME);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
    }

    public async initialize(contextPath: Uri): Promise<any> {
        return await new Promise((resolve, reject) => {
            const workspaceFolder: Uri = vscode.workspace.getWorkspaceFolder(contextPath)
                ? vscode.workspace.getWorkspaceFolder(contextPath).uri
                : null;
            if (!workspaceFolder) {
                reject('No active workspace selected');
            }

            const configFilePath: Uri = Uri.parse(
                vscode.workspace.getWorkspaceFolder(contextPath).uri + '/' + Constants.CONFIG_FILE_NAME
            );

            if (this.configSet.has(workspaceFolder.fsPath)) {
                resolve(this.configSet.get(workspaceFolder.fsPath));
            } else {
                // initialize Configuration file
                fs.stat(configFilePath.fsPath, (err: any) => {
                    // config file exists!
                    if (err == null) {
                        ConfigurationDao.initializeConfiguration(configFilePath)
                            .then((config: IConfig) => {
                                // stored credentials?
                                if (config.storeCredentials) {
                                    vscode.window.spgo.credentials = CredentialDao.getCredentials(
                                        config.sharePointSiteUrl
                                    );
                                }
                                Logger.updateStatusBar('SPGo enabled', 5);

                                // make sure the SPGO status bar display is visible.
                                vscode.window.spgo.statusBarItem.show();

                                // cache config
                                this.configSet.set(workspaceFolder.fsPath, config);

                                resolve(config);
                            })
                            .catch((err) => {
                                Logger.showError('SPGo: Missing Configuration');
                                Logger.outputError(err);
                                reject();
                            });
                    } else {
                        // run config
                        vscode.window
                            .showWarningMessage(
                                'SPGo has not been configured for this project. Would you like to configure your workspace now?',
                                Constants.OPTIONS_YES,
                                Constants.OPTIONS_NO
                            )
                            .then((result) => {
                                if (result == Constants.OPTIONS_NO) {
                                    reject('SPGo initialization cancelled by user.');
                                    // TODO: Unload extension
                                } else {
                                    const command: ICommand = new ConfigureWorkspaceCommand();
                                    command.execute(null).then((config: IConfig) => {
                                        Logger.updateStatusBar('SPGo enabled', 5);

                                        // make sure the SPGO status bar display is visible.
                                        vscode.window.spgo.statusBarItem.show();

                                        // cache config
                                        this.configSet.set(workspaceFolder.fsPath, config);

                                        resolve(config);
                                    });
                                }
                            });
                    }
                });
            }
        });
    }

    public reloadConfiguration(newConfig: Uri): void {
        ConfigurationDao.initializeConfiguration(newConfig)
            .then((config: IConfig) => {
                const workspaceFolder: Uri = vscode.workspace.getWorkspaceFolder(newConfig).uri;
                const oldConfig: IConfig = vscode.window.spgo.configSet.get(workspaceFolder.fsPath);
                // Has the authentication type changed? If so, delete credentials.
                if (oldConfig.authenticationType !== config.authenticationType) {
                    vscode.window.spgo.credentials = null;
                }

                vscode.window.spgo.configSet.set(workspaceFolder.fsPath, config);
                Logger.updateStatusBar('Configuration file reloaded', 5);
            })
            .catch((err: IError) => {
                Logger.showError(err.message, err);
            });
    }
}
