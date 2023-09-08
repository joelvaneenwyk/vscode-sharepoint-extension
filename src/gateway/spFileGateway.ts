// import * as vscode from 'vscode';

import { type IAuthOptions, type ISPRequest } from 'sp-request';
import { SPPull, type ISPPullContext, type ISPPullOptions } from 'sppull';
import { spsave, type FileOptions, type ICoreOptions } from 'spsave';
import { type Uri } from 'vscode';
import { type IConfig, type IFileGateway, type ISPFileInformation } from '../spgo';
import { RequestHelper } from '../util/requestHelper';
import { WorkspaceHelper } from '../util/workspaceHelper';

export class SPFileGateway implements IFileGateway {
    _config: IConfig;

    constructor(config: IConfig) {
        this._config = config;
    }

    public async checkOutFile(fileUri: Uri, spr: ISPRequest): Promise<any> {
        const sharePointSiteUrl: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(fileUri.toString(), this._config);

        return await spr.requestDigest(sharePointSiteUrl.toString()).then(async (digest) => {
            return await spr.post(
                sharePointSiteUrl +
                    "/_api/web/GetFileByServerRelativeUrl('" +
                    encodeURI(fileUri.path) +
                    "')/CheckOut()",
                {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                }
            );
        });
    }

    public async deleteFile(fileUri: Uri, spr: ISPRequest): Promise<any> {
        const sharePointSiteUrl: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(
            this._config.sharePointSiteUrl + fileUri,
            this._config
        );

        return await spr.requestDigest(sharePointSiteUrl.toString()).then(async (digest) => {
            return await spr.post(
                sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) + "')",
                {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest, {
                        'X-HTTP-Method': 'DELETE',
                        accept: 'application/json; odata=verbose',
                        'content-type': 'application/json; odata=verbose'
                    })
                }
            );
        });
    }

    public async downloadFiles(context: ISPPullContext, fileOptions: ISPPullOptions): Promise<any> {
        return await SPPull.download(context, fileOptions);
    }

    // CheckOutType: Online = 0; Offline = 1; None = 2.
    // all status values: https://msdn.microsoft.com/en-us/library/office/dn450841.aspx
    public async getFileInformation(fileUri: Uri, spr: ISPRequest): Promise<any> {
        const sharePointSiteUrl: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(
            this._config.sharePointSiteUrl + fileUri,
            this._config
        );

        return await spr.requestDigest(sharePointSiteUrl.toString()).then(async (digest) => {
            return await spr
                .get(
                    sharePointSiteUrl +
                        "/_api/web/GetFileByServerRelativeUrl('" +
                        encodeURI(fileUri.path) +
                        "')/?$select=Name,ServerRelativeUrl,CheckOutType,TimeLastModified,CheckedOutByUser",
                    {
                        body: {},
                        headers: RequestHelper.createAuthHeaders(this._config, digest)
                    }
                )
                .then(async (response) => {
                    const fileInfo: ISPFileInformation = {
                        checkOutType: response.body.d.CheckOutType,
                        name: response.body.d.Name,
                        timeLastModified: response.body.d.TimeLastModified
                    };

                    // File is checked out
                    if (fileInfo.checkOutType == 0 || fileInfo.checkOutType == 1) {
                        // '/_api/web/getFileByServerRelativeUrl(\'' + encodeURI(fileName) + '\')/CheckedOutByUser?$select=Title,Email';
                        return await spr
                            .get(
                                sharePointSiteUrl +
                                    "/_api/web/GetFileByServerRelativeUrl('" +
                                    encodeURI(fileUri.path) +
                                    "')/CheckedOutByUser?$select=Title,Email",
                                {
                                    body: {},
                                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                                }
                            )
                            .then((userInfo) => {
                                fileInfo.checkOutBy = userInfo.body.d.Title;
                                return fileInfo;
                            });
                    } else {
                        return fileInfo;
                    }
                });
        });
    }

    public async undoCheckOutFile(fileUri: Uri, spr: ISPRequest): Promise<any> {
        const sharePointSiteUrl: Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(
            this._config.sharePointSiteUrl + fileUri,
            this._config
        );

        return await spr.requestDigest(sharePointSiteUrl.toString()).then(async (digest) => {
            return await spr.post(
                sharePointSiteUrl +
                    "/_api/web/GetFileByServerRelativeUrl('" +
                    encodeURI(fileUri.path) +
                    "')/undocheckout()",
                {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                }
            );
        });
    }

    public async uploadFiles(
        coreOptions: ICoreOptions,
        credentials: IAuthOptions,
        fileOptions: FileOptions
    ): Promise<any> {
        RequestHelper.setNtlmHeader(this._config);

        return await spsave(coreOptions, credentials, fileOptions);
    }
}
