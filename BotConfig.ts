import * as IO from './File';
import * as fs from 'fs';

export class BotConfig
    {
        Token :string | null = null;
        cVersion :number = 1.0;

        static Parse(filePath:string): BotConfig|null
        {
            try
            {
                if(!IO.File.Exists(filePath))
                    throw new Error("Config file not found.");
    
                let content = fs.readFileSync(filePath, 'utf8');
                
                return IO.YamlSerializer.Deserialize(content);
            }
            catch
            {
                return null;
            }
        }
    }
