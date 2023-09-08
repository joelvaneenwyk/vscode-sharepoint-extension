import * as path from 'path';
import * as assert from 'assert';
import * as vscode from 'vscode';

import { Uri } from 'vscode';
import { type IConfig } from '../../src/spgo';
import { Constants } from '../../src/constants';
import { DownloadFileOptionsFactory } from '../../src/factory/downloadFileOptionsFactory';
import { type ISPPullOptions } from 'sppull/dist/interfaces';



describe("Convert Glob to Caml Tests", () => {
    
    const globRoot : string = 'path/';

    const config : IConfig = {
            authenticationType : Constants.SECURITY_DIGEST,
            publishingScope : Constants.PUBLISHING_NONE,
            sourceDirectory : '/sites/spgo',      // The relative directory structure underneath the VSCode local workspace root directory
            workspaceRoot : `${vscode.workspace.workspaceFolders[0].uri}${path.sep}${'src'}`
    };
    
    beforeEach(() => {
        
    });

    it("Should test the Constructor", () => {
        const globString : string = globRoot;
        const converter : DownloadFileOptionsFactory = new DownloadFileOptionsFactory(globString);

        assert.equal(converter.glob.orig, globString);
    });

    it("Should detect when a valid source directory has been provided", () => {
        const globString : string = globRoot;
        const converter : DownloadFileOptionsFactory = new DownloadFileOptionsFactory(globString);

        assert.equal(converter.glob.orig, globString);
    });

    it("Should detect when a folder structure has a globstar", () => {
        const globString : string = 'siteassets/**';
        const siteUrl : Uri = Uri.parse('https://company.sitego.co/sites/spgo/siteassets/**');
        const converter : DownloadFileOptionsFactory = new DownloadFileOptionsFactory(globString);
        const options : ISPPullOptions = converter.createFileOptions(siteUrl, config);

        assert.equal(converter.glob.is.globstar, true);
        assert.equal(options.recursive, true);
        assert.equal(options.createEmptyFolders, true);
    });

    it("Should detect when a folder structure does not have a globstar", () => {
        const globString : string = 'siteassets';
        const siteUrl : Uri = Uri.parse('https://company.sitego.co/sites/spgo/siteassets/**');
        const converter : DownloadFileOptionsFactory = new DownloadFileOptionsFactory(globString);
        const options : ISPPullOptions = converter.createFileOptions(siteUrl, config);

        assert.equal(converter.glob.is.globstar, false);
        assert.equal(options.recursive, false);
        assert.equal(options.createEmptyFolders, false);
    });

});