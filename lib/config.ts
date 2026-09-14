import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

// logLevel defined here (not in class.ts) to avoid circular dependency
export enum logLevel {
    fatal = 9,
    error = 8,
    warn = 2,
    info = 1,
    debug = 0,
    slient = -1
}

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
            const resolvedPath = path.resolve(filePath);
            fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
            fs.appendFileSync(resolvedPath,content);
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
            let raw = yaml.parse(content) as any;
            if (!raw) return undefined;

            let cfg = new config();
            const core = raw.core ?? {};
            const env = raw.env ?? {};
            const login = raw.login ?? {};
            const database = raw.database ?? {};

            // Support both the current nested sections and the legacy env section.
            cfg.core.confVer = core.version ?? raw.version ?? 0;
            cfg.core.logLevel = core.logLevel ?? env.logLevel ?? logLevel.debug;
            cfg.core.logPath = core.logPath ?? env.logfile ?? env.logPath;

            // Login (Telegram): tokenT/proxy are now under login, but old files
            // placed them under env.
            cfg.login.tokenT = login.tokenT ?? login.token ?? env.bottoken ?? env.botToken;
            cfg.login.proxy = login.proxy ?? env.proxy;

            // Database
            cfg.database.type = database.type ?? 'pgsql';
            cfg.database.host = database.host ?? '127.0.0.1';
            cfg.database.port = database.port;
            cfg.database.username = database.username ?? 'kalium';
            cfg.database.password = database.password;
            cfg.database.db = database.db ?? database.database ?? database.name ?? 'kalium';

            return cfg;
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
