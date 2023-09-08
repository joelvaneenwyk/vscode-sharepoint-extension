import { type ICredential } from '../spgo';

export class Credential implements ICredential {
    private readonly _username: string;
    private readonly _password: string;

    constructor(username: string, password: string) {
        this._username = username;
        this._password = password;
    }

    public get username(): string {
        return this._username;
    }

    public get password(): string {
        return this._password;
    }
}
