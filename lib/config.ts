import * as fs from 'fs';
import yaml from 'yaml';
import { logLevel } from './class';

export class file {
    static exist(filePath: string): boolean {
        try {
            fs.statSync(filePath);
            return true;
        } catch (err) {
            return false;
        }
    }
    static appendText(filePath: string,content: string): boolean {
        try {
            fs.appendFileSync(filePath,content);
            return true;
        } catch (err) {
            return false;
        }
    }
    static read(filePath: string): string|undefined
    {
        try
        {
            if(!this.exist(filePath))
                return undefined;
    
            return fs.readFileSync(filePath, 'utf-8');
        }
        catch
        {
            return undefined;
        }
    }
}

export interface ISerializer {
    serialize(): string;
}

export class YamlSerializer implements ISerializer {
    serialize() {
        return yaml.stringify(this);
    }
    static serialize<T>(obj: T) {
        return yaml.stringify(obj);
    }
    static deserialize<T>(s: string): T {
        return yaml.parse(s) as T;
    }
}

export class config {
    core: core = new core();
    login: login = new login();
    database: database = new database();

    static parse(filePath:string): config | undefined {
        try {
            if(!file.exist(filePath)) {
                throw new Error("EK0001: Config not found.");
            }
            let content = fs.readFileSync(filePath, 'utf8');
            return YamlSerializer.deserialize(content);
        } catch {
            return undefined;
        }
    }
}

export class core {
    confVer: number;
    logLevel: logLevel
    logPath:string;
}

export class login {
    tokenT: string;
    proxy: string;
}

export class database {
    type: string
    host: string
    port: number
    username: string
    password: string
    db: string
}
