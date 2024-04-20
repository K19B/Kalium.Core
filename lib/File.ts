import * as fs from 'fs';
import yaml from 'yaml';

export class File
{
    static Exists(filePath: string): boolean
    {
        try 
        {
            fs.statSync(filePath);
            return true;
        } catch (err) {
            return false;
        }
    }
}
export interface ISerializer
{
    Serialize(): string;
}
export class YamlSerializer implements ISerializer
{
    Serialize(): string
    {
        return yaml.stringify(this);
    }
    static Serialize<T>(obj: T): string
    {
        return yaml.stringify(obj);
    }
    static Deserialize<T>(s: string): T
    {
        let obj = yaml.parse(s) as T;
        return obj;
    }
}
