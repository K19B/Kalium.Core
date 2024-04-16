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
export class YamlSerializer
{
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
