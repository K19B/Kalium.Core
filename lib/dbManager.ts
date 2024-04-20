import * as sql from 'sqlite3';
import { DebugType, LogManager, User } from './Class';
import { resolve } from 'path';
import { stringTag } from 'yaml/util';
import { File, ISerializer, YamlSerializer } from './File';
import { PrismaClient } from '@prisma/client';

enum dbType
{
    Sql,
    MogonDB,
    Unknown
}
enum DataType
{
    Other,
    User
}
class PrismaManager
{
    private client;
    constructor()
    {
        this.client = new PrismaClient()
    }
}
class Data<T> extends YamlSerializer{
    Type: DataType
    Object: T
    constructor(type: DataType,obj: T)
    {
        super();
        this.Type = type;
        this.Object = obj;
    }
}
export class LocalDB
{
    private dbFile: string;
    private db: Map<string,any[]> = new Map<string,any[]>();

    constructor(filePath: string)
    {
        
        this.dbFile = filePath;
        if(File.Exists(filePath))
        {
            let obj: LocalDB = YamlSerializer.Deserialize<LocalDB>(filePath);
            this.db = obj.db;
        }
    }
    add<T extends object>(obj: T): boolean
    {
        try
        {
            let k: string = typeof(obj);
            if(this.db.has(k))
            {
                let array = this.db.get(k) as T[];
                if(array.includes(obj))
                    return false;
                else
                    array.push(obj);
            }
            else
            {
                let array: T[] = [obj];
                this.db.set(k,array);
            }
            return true;
        }
        catch
        {
            return false;
        }
    }
    remove<T extends object>(obj: T): boolean
    {
        try
        {
            let k: string = typeof(obj);
            if(this.db.has(k))
            {
                let array = this.db.get(k) as T[];
                if(array.includes(obj))
                    array.slice(array.indexOf(obj),1)
                else
                    return false;
            }
            else
                return false;
        }
        catch
        {
        }
        return false;
    }
}
class SqlDB
{
    private db: sql.Database;
    private Tables: string[] = [];
    private readonly InitRows:Map<string,string> = new Map<string,string>([ 
                                                   ["Type","INTEGER"],
                                                   ["Object","TEXT"]
                                               ]);
    private readonly Rows: string[] = ["Type","Object"];
    Type: dbType

    constructor(filePath: string)
    {
        this.db = new sql.Database(filePath);
    }
    async insert<T>(table: string,data:Data<T>): Promise<boolean>
    {
        let values: string[] = [`${data.Type}`,`${data.Serialize()}`];
        let sql: string = `INSERT INTO ${table} (${this.Rows.join(",")}) VALUES (${values.join(",")})`;
        return new Promise<boolean>((resolve) =>{
            this.db.run(sql,(err) =>{
                if(err)
                {
                    LogManager.Debug(`Error inserting data to '${table}':\n${err.message}`, DebugType.Error);
                    resolve(false);
                }
                else
                    resolve(true);
            });
        })
    }
    async search<T>(table: string,type: DataType): Promise<Data<T>[]>
    {
        let result: Array<Data<T>> = [];
        let sql: string = `SELECT * FROM ${table} WHERE Type='${type}'`;
        return new Promise<Data<T>[]>((resolve) =>{
            this.db.all<any>(sql,(err,rows) =>{
                if(err)
                {
                    LogManager.Debug(`Error inserting data to '${table}':\n${err.message}`, DebugType.Error);
                    resolve([]);
                }
                else
                {
                    rows.forEach((row) =>{
                        result.push(YamlSerializer.Deserialize<Data<T>>(row.Object));
                    })
                    resolve(result);
                }
            });
        })
    }
    async getTables(): Promise<string[]> {
        return new Promise<string[]>((resolve) =>{
            this.db.all<any>(`SELECT name FROM sqlite_master WHERE type='table'`, (err, rows) => {
                if (err) {
                    LogManager.Debug(`Error querying database:\n${err.message}`, DebugType.Error);
                } else {
                    this.Tables = [];
                    rows.forEach((row) => {
                        this.Tables.push(row.name);
                        resolve(this.Tables)
                    });
                }
            });
        });
    }
    async createTable(table: string): Promise<boolean>
    {
        let rows:Array<string> = [];
        this.InitRows.forEach((v,k) => {
            rows.push(`${k} ${v}`)
        })
        let sql = `CREATE TABLE IF NOT EXISTS ${table} (${rows.join(",")})`;
        return new Promise<boolean>((resolve) =>{
            this.db.run(sql,(err) =>{
                if(err)
                {
                    LogManager.Debug(`Error creating table '${table}':\n${err.message}`, DebugType.Error);
                    resolve(false);
                }
                else
                    resolve(true);
            });
        })
    }
}
interface IDatabase 
{
    Type: dbType
    CurrentTable: string;

    insert<T extends object>(key: string,data: T): boolean;
}
