import * as vscode from 'vscode';

import { type IAuthOptions, type ISPRequest } from 'sp-request';
import { type ISPPullOptions } from 'sppull';
import { type FileOptions, type ICoreOptions } from 'spsave';
import { Uri } from 'vscode';
import { Constants } from '../constants';
import { DownloadFileOptionsFactory } from '../factory/downloadFileOptionsFactory';
import { SPFileGateway } from '../gateway/spFileGateway';
import { type IConfig, type IFileGateway, type IPublishingAction } from '../spgo';
import { FileHelper } from '../util/fileHelper';
import { Logger } from '../util/logger';
import { RequestHelper } from '../util/requestHelper';
import { UrlHelper } from '../util/urlHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

export class SPFileService {
    _config: IConfig;
    _fileGateway: IFileGateway;

    constructor(config: IConfig, gateway?: IFileGateway) {
        this._config = config;
        this._fileGateway = gateway || new SPFileGateway(config);
    }

    public async checkOutFile(textDocument: Uri): Promise<any> {
        const spr: ISPRequest = RequestHelper.createRequest(vscode.window.spgo, this._config);
        const fileUri: Uri = UrlHelper.getServerRelativeFileUri(textDocument.fsPath, this._config);

        return await this._fileGateway.checkOutFile(fileUri, spr);
    }

    public async deleteFileFromServer(fileUri: Uri): Promise<any> {
        const spr: ISPRequest = RequestHelper.createRequest(vscode.window.spgo, this._config);
        const remoteFileUri: Uri = UrlHelper.getServerRelativeFileUri(fileUri.fsPath, this._config);

        return await this._fileGateway.deleteFile(remoteFileUri, spr);
    }

    public async downloadFiles(siteUrl: Uri, remoteFolder: string): Promise<any> {
        // format the remote folder to /<folder structure>/
        remoteFolder = UrlHelper.ensureLeadingWebSlash(remoteFolder);
        const factory: DownloadFileOptionsFactory = new DownloadFileOptionsFactory(remoteFolder);

        const context: any = {
            siteUrl: siteUrl.toString(),
            creds: RequestHelper.createCredentials(vscode.window.spgo, this._config)
        };

        const options: ISPPullOptions = factory.createFileOptions(siteUrl, this._config);
        // let localFolder : string = options.dlRootFolder + UrlHelper.removeLeadingSlash(FileHelper.convertToForwardSlash(options.spRootFolder));

        return await this._fileGateway.downloadFiles(context, options);
    }

    public async downloadFileMajorVersion(filePath: Uri, downloadFilePath?: string): Promise<any> {
        const remoteFolder: string = FileHelper.getFolderFromPath(filePath, this._config);
        const remoteFileUri: Uri = UrlHelper.getServerRelativeFileUri(filePath.fsPath, this._config);
        const sharePointSiteUrl: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(remoteFileUri.path, this._config);

        const context: any = {
            siteUrl: sharePointSiteUrl.toString(),
            creds: RequestHelper.createCredentials(vscode.window.spgo, this._config)
        };

        const options: any = {
            spBaseFolder: sharePointSiteUrl.path === '' ? '/' : sharePointSiteUrl.path,
            spRootFolder: UrlHelper.normalizeSlashes(remoteFolder),
            strictObjects: [remoteFileUri.path],
            dlRootFolder: downloadFilePath
        };
        // let localFolder : string = options.dlRootFolder + UrlHelper.removeLeadingSlash(FileHelper.convertToForwardSlash(options.spRootFolder));

        return await this._fileGateway.downloadFiles(context, options);
    }

    // CheckOutType: Online = 0; Offline = 1; None = 2.
    // all status values: https://msdn.microsoft.com/en-us/library/office/dn450841.aspx
    public async getFileInformation(textDocument: Uri): Promise<any> {
        const fileUri: Uri = UrlHelper.getServerRelativeFileUri(textDocument.fsPath, this._config);
        const spr: ISPRequest = RequestHelper.createRequest(vscode.window.spgo, this._config);

        Logger.outputMessage(`Getting file information for:  ${textDocument.fsPath}`, vscode.window.spgo.outputChannel);

        return await this._fileGateway.getFileInformation(fileUri, spr);
    }

    public async checkoutFile(filePath: Uri): Promise<any> {
        const fileUri: Uri = UrlHelper.getServerRelativeFileUri(filePath.fsPath, this._config);
        const spr: ISPRequest = RequestHelper.createRequest(vscode.window.spgo, this._config);

        Logger.outputMessage(`Checking out File:  ${fileUri.fsPath}`, vscode.window.spgo.outputChannel);

        return await this._fileGateway.checkOutFile(fileUri, spr);
    }

    // TODO: Test this function to work with custom publishWorkspaceOptions props.
    public async publishWorkspace(publishingInfo: IPublishingAction): Promise<any> {
        // let publishingOptions : IPublishWorkspaceOptions = this.buildPublishingOptions(this._config.publishWorkspaceOptions);
        const credentials: IAuthOptions = RequestHelper.createCredentials(vscode.window.spgo, this._config);
        const remoteFileUri: Uri = Uri.parse(
            `${this._config.sharePointSiteUrl}${this._config.publishWorkspaceOptions.destinationFolder}`
        ); // UrlHelper.getServerRelativeFileUri(publishingOptions.globPattern, this._config);
        const coreOptions: ICoreOptions = this.buildCoreUploadOptions(remoteFileUri, publishingInfo);
        const fileOptions: FileOptions = {
            glob: this._config.publishWorkspaceOptions.globPattern,
            folder: this._config.publishWorkspaceOptions.destinationFolder,
            base: this._config.publishWorkspaceOptions.localRoot
        };

        for (const pattern of this._config.publishWorkspaceOptions.globPattern) {
            Logger.outputMessage(`publishing files:  ${pattern}`, vscode.window.spgo.outputChannel);
        }

        return await this._fileGateway.uploadFiles(coreOptions, credentials, fileOptions);
    }

    public async undoFileCheckout(filePath: vscode.Uri): Promise<any> {
        const fileUri: Uri = UrlHelper.getServerRelativeFileUri(filePath.fsPath, this._config);
        const spr: ISPRequest = RequestHelper.createRequest(vscode.window.spgo, this._config);

        Logger.outputMessage(`Discarding Check out for File:  ${fileUri.fsPath}`, vscode.window.spgo.outputChannel);

        return await this._fileGateway.undoCheckOutFile(fileUri, spr);
    }

    public async uploadFilesToServer(publishingInfo: IPublishingAction): Promise<any> {
        const credentials: IAuthOptions = RequestHelper.createCredentials(vscode.window.spgo, this._config);
        const remoteFileUri: Uri = UrlHelper.getServerRelativeFileUri(publishingInfo.contentUri, this._config);
        const coreOptions: ICoreOptions = this.buildCoreUploadOptions(remoteFileUri, publishingInfo);
        const localFilePath: string = this.calculateBaseFolder(coreOptions);
        const fileOptions: FileOptions = {
            glob: publishingInfo.contentUri,
            base: localFilePath,
            folder: '/'
        };

        Logger.outputMessage(`Uploading file:  ${publishingInfo.contentUri}`, vscode.window.spgo.outputChannel);

        return await this._fileGateway.uploadFiles(coreOptions, credentials, fileOptions);
    }

    private buildCoreUploadOptions(remoteFileUri: Uri, publishingInfo: IPublishingAction): any {
        const coreOptions: ICoreOptions = {
            siteUrl: WorkspaceHelper.getSiteUriForActiveWorkspace(remoteFileUri.toString(), this._config).toString(),
            checkinMessage: encodeURI(publishingInfo.message),
            checkin: false
        };

        if (publishingInfo.scope === Constants.PUBLISHING_MAJOR) {
            coreOptions.checkin = true;
            coreOptions.checkinType = 1;
        } else if (publishingInfo.scope === Constants.PUBLISHING_MINOR) {
            coreOptions.checkin = true;
            coreOptions.checkinType = 0;
        }

        return coreOptions;
    }

    // helper for SPPush integration - need to append the SubSite root to the 'local folder' path otherwise you get duplicate tokens in path
    // e.g. test.js successfully uploaded to 'https://<server>/sites/site/subsite/subsite/Style Library'
    private calculateBaseFolder(coreOptions: ICoreOptions) {
        const subSiteUrl: string = coreOptions.siteUrl.split(this._config.sharePointSiteUrl)[1];
        return this._config.sourceRoot + FileHelper.convertToForwardSlash(subSiteUrl);
    }
}
