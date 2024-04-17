import * as sql from 'sqlite3';
import { DebugType, LogManager } from './Class';
import { resolve } from 'path';

export class DatabaseManager
{
    private db: sql.Database;
    private Tables: string[] = [];
    CurrentTable: string = "";

    constructor(filePath: string)
    {
        this.db = new sql.Database(filePath);
    }
    async insert(data: Map<string,string>): Promise<boolean>
    {
        let rows: string[] = [];
        let values: string[] = [];
        data.forEach((v,k) =>{
            rows.push(k);
            values.push(`'${v}'`);
        });
        let sql: string = `INSERT INTO ${this.CurrentTable} (${rows.join(",")}) VALUES (${values.join(",")})`;
        return new Promise<boolean>((resolve) =>{
            this.db.run(sql,(err) =>{
                if(err)
                {
                    LogManager.Debug(`Error inserting data to '${this.CurrentTable}':\n${err.message}`, DebugType.Error);
                    resolve(false);
                }
                else
                    resolve(true);
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
    setTable(table: string): boolean
    {
        if(this.Tables.includes(table))
        {
            this.CurrentTable = table;
            return true;
        }
        return false;
    }
    async createTable(types: Map<string,string[]>): Promise<boolean>
    {
        let rows:Array<string> = [];
        types.forEach((v,k) => {
            rows.push(`${k} ${v.join(" ")}`)
        })
        let sql = `CREATE TABLE IF NOT EXISTS ${this.CurrentTable} (${rows.join(",")})`;
        return new Promise<boolean>((resolve) =>{
            this.db.run(sql,(err) =>{
                if(err)
                {
                    LogManager.Debug(`Error creating table '${this.CurrentTable}':\n${err.message}`, DebugType.Error);
                    resolve(false);
                }
                else
                    resolve(true);
            });
        })
    }
}