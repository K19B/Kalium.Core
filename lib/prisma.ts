import { config } from './config';
import fse from 'fs-extra';
import path from 'path';

const dbConfig = config.parse('./config.yaml');

export function dbFullType() {
    let confDbType = dbConfig?.database.type.toLowerCase();
    if (confDbType == 'pg' || confDbType == 'pgsql' || confDbType == 'postgre' || confDbType == 'postgres' || confDbType == 'postgresql') {
        return 'postgresql';
    }
    if (confDbType == 'my' || confDbType == 'mysql' || confDbType == 'maria' || confDbType == 'mariadb') {
        return 'mysql';
    }
    throw new Error("EK0003: DB detect failed.");
}

export function dbDir() {
    if (dbFullType() == 'postgresql') {
        return 'pgsql';
    } else if (dbFullType() == 'mysql') {
        return 'mysql';
    }
    throw new Error("EK0006: DB dir detect failed, should unreachable.");
}

export function dbPort() {
    if (dbConfig?.database.port) {
        return dbConfig?.database.port
    } else if (dbFullType() == 'postgresql') {
        return 5432;
    } else if (dbFullType() == 'mysql') {
        return 3306;
    }
    throw new Error("EK0005: DB port detect failed, should unreachable.");
}

export function dbCheckFinish() {
    if (!dbConfig?.database.host || !dbConfig.database.db || !dbFullType()) {
        throw new Error("EK0004: DB unfinished.");
    }
}

export function dbUrl() {
    dbCheckFinish();
    let hasUser: string = "";
    let hasPassword: string = "";
    let hasPort: string = "";
    if (dbConfig?.database.username) {
        hasUser = dbConfig?.database.username;
        if (dbConfig?.database.password) {
            hasPassword = ':' + dbConfig?.database.password + '@';
        } else {
            hasPassword = '@';
        }
    }
    if (dbPort() != undefined) {
        hasPort = ':' + dbPort()
    }
    return dbFullType() + '://' + hasUser + hasPassword + hasPort + '/' + dbConfig?.database.db;
}

export function copyPrisma() {
    let src = path.resolve(__dirname, `../prisma/${dbDir()}`);
    let dst = path.resolve(__dirname, '../prisma');
    fse.copySync(src, dst);
}
