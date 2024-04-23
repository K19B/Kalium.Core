import nodeBot, { Audio, Document, ParseMode, PhotoSize } from 'node-telegram-bot-api';
import * as color from './color';
import { $Enums, PrismaClient } from '@prisma/client';
import { BOTCONFIG, LOGNAME } from '../main';
import { file } from './config';

export enum logLevel {
    slient = -10,
    fatal,
    error,
    warn = -1,
    info,
    debug
}
export enum permission
{
    disabled = -1,
    default,
    whiteListed,
    admin,
    owner = 19
}
export enum regMaiServer
{
    JP,
    Intl,
    CN
}
export enum maiLoginType
{
    sega,
    netId,
    friend
}

export class logger {
    static debug(content: string, level: logLevel = logLevel.debug) {
        let text: string | undefined;
        switch(level) {
            case logLevel.debug:
                text = rendering(color.fWhite,color.bBlack," DBUG ") + rendering(color.bCyan,color.fBlack,"  CORE  ") + content;
            break;
            case logLevel.info:
                text = rendering(color.fBlack,color.bWhite," INFO ") + rendering(color.bCyan,color.fBlack,"  CORE  ") + content;
            break;
            case logLevel.warn:
                text = rendering(color.fBlack,color.bYellow," WARN ") + content;
            break;
            case logLevel.error:
                text = rendering(color.fBlack,color.bRed," ERRO ") + content;
            break;
            case logLevel.fatal:
                text = rendering(color.fBlack,color.bRed," FTAL ") + content;
            break;
        }
        if (text) {
            if (level >= BOTCONFIG?.core.logLevel!) {
                console.log(text);
            }
            if
            (
                !BOTCONFIG?.core.logPath // logPath defined
                && !file.appendText(`${BOTCONFIG?.core.logPath}/${LOGNAME}`,`${text}\n`) // write log fail
            )
            {
                console.log(`${rendering(color.fBlack,color.bRed," ERRO ")} Failed writing log to file.`);
            }
        }
    }
}
export function rendering(f: string, b: string, content: string)
{
    return `${b}${f}${content}${color.reset}`;
}
export class message{
    id: number
    from: User
    chat: nodeBot.Chat
    text: string | undefined
    audio: Audio | undefined
    document: Document | undefined
    photo: PhotoSize[] | undefined
    command: command | undefined
    client: nodeBot | undefined

    constructor(id: number, from: nodeBot.User, chat: nodeBot.Chat, command: command | undefined)
    {
        this.id = id;
        this.from = User.parse(from)!;
        this.chat = chat;
        this.command = command;
        if(command !== undefined)
        {
            this.text = "/" + command?.prefix! + " " + command.content.join(" ");
        }
        else
            this.text = undefined;
    }

    // If chat is private,return true
    isPrivate(): boolean 
    {
        return this.chat.type === "private";
    }
    // If chat is Group or SuperGroup,return true
    isGroup(): boolean
    {
        return this.chat.type === ("group" || "supergroup");
    }
    // Send a new message and reply
    // Return: Sended message
    async reply(text: string,
                parseMode: ParseMode = "Markdown"): Promise<message| undefined>
    {
        let msg = await this.client!.sendMessage(this.chat.id, text, { parse_mode: parseMode, reply_to_message_id: this.id });

        return message.parse(this.client!,msg);
    }
    // Edit this message.
    // If you aren't this message sender,this action will make a error
    // Return: Edited message
    async edit(newText: string,
               parseMode: ParseMode = "Markdown"): Promise<message| undefined>
    {
        if(!(await this.canSend()))
            throw Error("Cannot edit this message.");
        let msg = await this.client!.editMessageText(newText,{ parse_mode: parseMode,
                                                               chat_id: this.chat.id,
                                                               message_id: this.id }) as nodeBot.Message

        return message.parse(this.client!,msg);
    }
    // Delete this message
    // If you aren't this message sender or no have corresponding authority,this action will make a error
    // Return: If success,return true
    async delete(): Promise<boolean>
    {
        return await this.client?.deleteMessage(this.chat.id,this.id)!;
    }
    // Send a message without reply
    // Return: Sended message
    async send(text: string,
               parseMode: ParseMode = "Markdown"): Promise<message| undefined> 
    {
        let msg = await this.client!.sendMessage(this.chat.id, text, { parse_mode: parseMode })

        return message.parse(this.client!,msg);
    }
    static async send(botClient: nodeBot,
                      chatId:number,
                      text: string,
                      parseMode: ParseMode = "Markdown"): Promise<message | undefined> 
    {
        let msg = await botClient.sendMessage(chatId, text, { parse_mode: parseMode })

        return message.parse(botClient,msg);
    }
    static parse(bot: nodeBot,botMsg: nodeBot.Message): message | undefined
    {
        try {
            let content: string | undefined = botMsg.text == undefined ?  botMsg.caption ?? "" : botMsg.text;
            let pCommand: command | undefined;
            if(content.length < 2) {
                pCommand = undefined
            } else {
                let array : string[] = content.split(" ").filter(x => x !== "");
                let prefix: string = array[0].replace("/","");
                pCommand = new command(prefix,array.slice(1));
            }
            let msg = new message(botMsg.message_id, botMsg.from!, botMsg.chat!, pCommand)
            msg.text = content;
            msg.audio = botMsg.audio;
            msg.document = botMsg.document;
            msg.photo = botMsg.photo;
            msg.client = bot;
            return msg;
        }
        catch {
            return undefined;
        }
    }
    private async canSend(): Promise<boolean> {
        if(this.client != undefined) {
            return true;
        } else if((await (this.client! as nodeBot).getMe()).id === this.from.Id) {
            return true;
        }
        return false;
    }
}
export class command{
    prefix: string
    content: string[]
    constructor (prefix: string, content: string[]) {
        this.prefix = prefix;
        this.content = content;
    }
}
export class maiAccount
{
    id: number
    server: regMaiServer
    loginType: maiLoginType
    maiId: string
    maiToken: string | undefined
    maiAlterId: string | undefined
    maiAlterToken: string | undefined

    constructor(id: number,server: regMaiServer){
        this.id = id;
        this.server = server;
        this.maiId;
        this.maiToken;
        this.maiAlterId;
        this.maiAlterToken;
    }
    async save(db: PrismaClient): Promise<void> {
        let data = this.makeData();
        let _ = ["JP","Intl","CN"];
        if(data == undefined)
            return;
        if(await maiAccount.search(db,this.id,this.server) != undefined) {
            await db.maiAccount.update({
                where: {
                    id: this.id,
                    server: _[this.server] as $Enums.regMaiServer
                },
                data: data
            });
        } else {
            await db.maiAccount.create({data: data});
        }
    }
    makeData(): ({
        id: number
        server: $Enums.regMaiServer
        loginType: maiLoginType
        maiId: string
        maiToken: string | undefined
        maiAlterId: string | undefined
        maiAlterToken: string | undefined
    }) | undefined {
        try {
            return {
                id: this.id,
                server: this.server == regMaiServer.CN ? $Enums.regMaiServer.CN :
                        this.server == regMaiServer.Intl ? $Enums.regMaiServer.Intl :
                        this.server == regMaiServer.JP ? $Enums.regMaiServer.JP : $Enums.regMaiServer.JP,
                maiId: this.maiId,
                maiToken: this.maiToken,
                maiAlterId: this.maiAlterId,
                maiAlterToken: this.maiAlterToken
            };
        }
        catch
        {
            return undefined;
        }
    }
    static async where(db: PrismaClient,func:(x: maiAccount) => boolean): Promise<maiAccount[]> {
        let result: maiAccount[] = await this.all(db);

        return result.filter(func);
    }
    static async select<T>(db: PrismaClient,func:(x: maiAccount) => T): Promise<T[]> {
        let users = await this.all(db);

        return users.map(func);
    }
    static async search(db: PrismaClient,id: number,server: regMaiServer): Promise<maiAccount|undefined> {
        let result: maiAccount|undefined = undefined;
        let _ = ["JP","Intl","CN"];
        let r = await db.maiAccount.findUnique({
            where: {
                id : id,
                server : _[server] as $Enums.regMaiServer
            }
        });
        if(r != undefined)
            result = this.convert(r);
        return result;
    }
    static async all(db: PrismaClient): Promise<maiAccount[]> {
        let result: maiAccount[] = [];
        let r = await db.maiAccount.findMany();
        r.forEach(y => {
            let u = this.convert(y);
            if(u != undefined)
                result.push(u);                
        });
        return result;
    }
    static convert(dbUser: {
        Id: number
        Server: $Enums.regMaiServer
        MaiUserId: bigint
        MaiPassword: string
        MaiToken: string
        MaiFCode: string}): maiAccount|undefined {
        try
        {
            let server = dbUser.Server == $Enums.regMaiServer.CN ? regMaiServer.CN :
                         dbUser.Server == $Enums.regMaiServer.Intl ? regMaiServer.Intl :
                         dbUser.Server == $Enums.regMaiServer.JP ? regMaiServer.JP : regMaiServer.JP;
            let user = new maiAccount(dbUser.Id,server);
            user.MaiFCode = dbUser.MaiFCode;
            user.MaiPassword = dbUser.MaiPassword;
            user.MaiToken = dbUser.MaiToken;
            user.MaiUserId = dbUser.MaiUserId;
            
            return user;  
        }
        catch
        {
            return undefined;
        }
    }
}
export class User
{
    Id: number
    Username: string
    Firstname: string
    Lastname: string
    Level: permission = permission.default

    constructor(id: number,
                username: string,
                fName: string,
                lName: string
    )
    {
        this.Id = id;
        this.Firstname = fName;
        this.Lastname = lName;
        this.Username = username;
    }
    getName(): string
    {
        return this.Firstname + " " + this.Lastname;
    }
    checkPermission(targetLevel: permission): boolean
    {
        if(this.Level >= targetLevel)
            return true;
        return false;
    }
    setPermission(targetLevel: permission): void
    {
        this.Level = targetLevel;
    }
    async save(db: PrismaClient): Promise<void> {
        let data = this.makeData();
        
        if(data == undefined)
            return;
        if(await User.search(db,this.Id) != undefined)
        {
            await db.user.update({
                where: {
                    Id: this.Id
                },
                data: data
            });
        }
        else
            await db.user.create({data: data});
    }
    makeData(): ({
        Id: number
        Username: string
        Firstname: string
        Lastname: string
        Level: $Enums.Permission})|undefined
    {
        try
        {
            
            return {
                Id: this.Id,
                Username : this.Username,
                Firstname: this.Firstname,
                Lastname: this.Lastname,
                Level: this.Level == permission.disabled ? $Enums.Permission.disabled :
                       this.Level == permission.default ? $Enums.Permission.default :
                       this.Level == permission.whiteListed ? $Enums.Permission.whiteListed :
                       this.Level == permission.admin ? $Enums.Permission.admin :
                       this.Level == permission.owner ? $Enums.Permission.owner : $Enums.Permission.disabled
            };
        }
        catch
        {
            return undefined;
        }
    }
    static async where(db: PrismaClient,func:(x: User) => boolean): Promise<User[]> {
        let result: User[] = await this.all(db);

        return result.filter(func);
    }
    static async select<T>(db: PrismaClient,func:(x: User) => T): Promise<T[]> {
        let users = await this.all(db);

        return users.map(func);
    }
    static async search(db: PrismaClient,id: number): Promise<User|undefined> {
        let result: User|undefined = undefined;
        let r = await db.user.findUnique({
            where: {
                Id : id
            }
        });
        if(r != undefined)
            result = this.convert(r);
        return result;
    }
    static async all(db: PrismaClient): Promise<User[]> {
        let result: User[] = [];
        let r = await db.user.findMany()
        r.forEach(y => {
            let u = this.convert(y);
            if(u != undefined)
                result.push(u);                
        })
        return result;
    }
    static convert(dbUser: {
        Id: number
        Username: string
        Firstname: string
        Lastname: string
        Level: $Enums.Permission}): User|undefined {
        try
        {
            let user = new User(dbUser.Id,
                dbUser.Username,
                dbUser.Firstname,
                dbUser.Lastname);
            user.Level = dbUser.Level == $Enums.Permission.disabled ? permission.disabled :
                         dbUser.Level == $Enums.Permission.default ? permission.default :
                         dbUser.Level == $Enums.Permission.whiteListed ? permission.whiteListed :
                         dbUser.Level == $Enums.Permission.admin ? permission.admin :
                         dbUser.Level == $Enums.Permission.owner ? permission.owner : Permission.disabled;
            return user;  
        }
        catch
        {
            return undefined;
        }
    }
    static parse(u: nodeBot.User|undefined): User|undefined
    {
        if(u == undefined) return undefined;

        let id = u.id;
        let fName = u.first_name ?? "";
        let lName = u.last_name ?? "";
        let username = u.username ?? "";

        return new User(id,username,fName,lName);
    }
}