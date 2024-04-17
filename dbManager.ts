import * as sql from 'sqlite3';

class DatabaseManager
{
    private db: sql.Database;
    CurrentTable: string = "";

    constructor(filePath: string)
    {
        this.db = new sql.Database(filePath);
    }

    getTables(): string[]
    {
        let result;
        this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                    [], 
                    (err, rows: any) => {
                        try
                        {
                            result = rows.map(x => x.name) as string[];
                        }
                        catch
                        {
                            result = [];
                        }
                    }
        );
        return result;
    }
}