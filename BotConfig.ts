import * as IO from './File.ts';
import * as fs from 'fs';

namespace Kalium.Core
{
    class BotConfig
    {
        Token:string;
        cVersion:number;

        static Parse(filePath:string):BotConfig
        {
            if(!IO.File.Exists(filePath))
                throw new Error("Config file not found.");

            let content = fs.readFileSync(filePath, 'utf8');
            
            return IO.YamlSerializer.Deserialize(content);
        }
    }
}
