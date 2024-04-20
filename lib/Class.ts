import nodeBot, { Audio, Document, ParseMode, PhotoSize } from 'node-telegram-bot-api';
import * as color from './color';
import { $Enums, PrismaClient } from '@prisma/client';

export enum DebugType
{
    Debug,
    Info,
    Warning,
    Error
}
export enum Permission
{
    Unknown = -1,
    Ban,
    Command,
    Advanced,
    Admin,
    Root = 999
}
export enum MaiServer
{
    JP,
    Intl,
    CN
}
export class LogManager
{
    static Debug(content :string,level :DebugType = DebugType.Info) :void
    {
        
        switch(level)
        {
            case DebugType.Debug:
                console.log(`${rendering(color.fWhite,color.bBlack," DEBUG ")}${rendering(color.bCyan,color.fBlack,"  CORE  ")}${content}`);
            break;
            case DebugType.Info:
                console.log(`${rendering(color.fBlack,color.bWhite," INFO  ")}${rendering(color.bCyan,color.fBlack,"  CORE  ")}${content}`);
            break;
            case DebugType.Warning:
                console.log(`${rendering(color.fBlack,color.bYellow," WARNING ")}${content}`);
            break;
            case DebugType.Error:
                console.log(`${rendering(color.fBlack,color.bRed," ERROR ")}${content}`);
            break;
        }
    }
}
export function rendering(f: string,b:string,content: string)
{
    return `${b}${f}${content}${color.reset}`;
}
export class Message{
    Id: number
    From: User
    Chat: nodeBot.Chat
    Text: string|undefined
    Audio: Audio|undefined
    Document: Document|undefined
    Photo: PhotoSize[]|undefined
    Command: Command| undefined
    Client: nodeBot| undefined

    constructor(id: number,from: nodeBot.User,chat: nodeBot.Chat,command: Command|undefined)
    {
        this.Id = id;
        this.From = User.parse(from)!;
        this.Chat = chat;
        this.Command = command;
        if(command !== undefined)
        {
            this.Text = "/" + command?.Prefix! + " " + command.Content.join(" ");
        }
        else
            this.Text = undefined;
    }

    /// 判断是否在私有会话
    isPrivate(): boolean 
    {
        return this.Chat.type === "private";
    }
    /// 判断是否在群聊
    isGroup(): boolean
    {
        return this.Chat.type === ("group" || "supergroup");
    }
    async reply(text: string,
                parseMode: ParseMode = "Markdown"): Promise<Message| undefined>
    {
        let msg = await this.Client!.sendMessage(this.Chat.id, text, { parse_mode: parseMode, reply_to_message_id: this.Id });

        return Message.parse(this.Client!,msg);
    }
    async edit(newText: string,
               parseMode: ParseMode = "Markdown"): Promise<Message| undefined>
    {
        if(!(await this.canSend()))
            return undefined;
        let msg = await this.Client!.editMessageText(newText,{ parse_mode: parseMode}) as nodeBot.Message

        return Message.parse(this.Client!,msg);
    }
    static async send(botClient: nodeBot,
                      chatId:number,
                      text: string,
                      parseMode: ParseMode = "Markdown"): Promise<Message| undefined> 
    {
        let msg = await botClient.sendMessage(chatId, text, { parse_mode: parseMode })

        return Message.parse(botClient,msg);
    }
    static parse(bot: nodeBot,botMsg: nodeBot.Message): Message| undefined
    {
        try
        {
            let content: string|undefined = botMsg.text == undefined ?  botMsg.caption ?? "" : botMsg.text;
            let command: Command|undefined;
            if(content.length < 2)
                command = undefined
            else
            {
                let array : string[] = content.split(" ").filter(x => x !== "");
                let prefix: string = array[0].replace("/","");
                command = new Command(prefix,array.slice(1));
            }       

            let msg = new Message(botMsg.message_id,botMsg.from!,botMsg.chat!,command)
            msg.Text = content;
            msg.Audio = botMsg.audio;
            msg.Document = botMsg.document;
            msg.Photo = botMsg.photo;
            msg.Client = bot;
            return msg;
        }
        catch
        {
            return undefined;
        }
    }
    private async canSend(): Promise<boolean>
    {
        
        if(this.Client != undefined)
            return true;
        else if((await (this.Client! as nodeBot).getMe()).id === this.From.Id)
            return true;
        return false;
    }
}
export class Command{
    Prefix: string
    Content: string[]

    constructor(prefix: string,content: string[])
    {
        this.Prefix = prefix;
        this.Content = content;
    }
}
export class MaiAccount
{
    Id: number
    Server: MaiServer
    MaiUserId: bigint
    MaiPassword: string
    MaiToken: string
    MaiFCode: string

    constructor(id: number,server: MaiServer){
        this.Id = id;
        this.Server = server;
        this.MaiUserId = -1n;
        this.MaiPassword = "";
        this.MaiToken = "";
        this.MaiFCode = "";
    }
    async save(db: PrismaClient): Promise<void> {
        let data = this.makeData();
        let _ = ["JP","Intl","CN"];
        if(data == undefined)
            return;
        if(await MaiAccount.search(db,this.Id,this.Server) != undefined)
        {
            await db.maiAccount.update({
                where: {
                    Id: this.Id,
                    Server : _[this.Server] as $Enums.MaiServer
                },
                data: data
            });
        }
        else
            await db.maiAccount.create({data: data});
    }
    makeData(): ({
        Id: number
        Server: $Enums.MaiServer
        MaiUserId: bigint
        MaiPassword: string
        MaiToken: string
        MaiFCode: string})|undefined
    {
        try
        {
            
            return {
                Id: this.Id,
                Server: this.Server == MaiServer.CN ? $Enums.MaiServer.CN :
                        this.Server == MaiServer.Intl ? $Enums.MaiServer.Intl :
                        this.Server == MaiServer.JP ? $Enums.MaiServer.JP : $Enums.MaiServer.JP,
                MaiUserId: this.MaiUserId,
                MaiPassword: this.MaiPassword,
                MaiToken: this.MaiToken,
                MaiFCode: this.MaiFCode
            };
        }
        catch
        {
            return undefined;
        }
    }
    static async where(db: PrismaClient,func:(x: MaiAccount) => boolean): Promise<MaiAccount[]> {
        let result: MaiAccount[] = await this.all(db);

        return result.filter(func);
    }
    static async select<T>(db: PrismaClient,func:(x: MaiAccount) => T): Promise<T[]> {
        let users = await this.all(db);

        return users.map(func);
    }
    static async search(db: PrismaClient,id: number,server: MaiServer): Promise<MaiAccount|undefined> {
        let result: MaiAccount|undefined = undefined;
        let _ = ["JP","Intl","CN"];
        let r = await db.maiAccount.findUnique({
            where: {
                Id : id,
                Server : _[server] as $Enums.MaiServer
            }
        });
        if(r != undefined)
            result = this.convert(r);
        return result;
    }
    static async all(db: PrismaClient): Promise<MaiAccount[]> {
        let result: MaiAccount[] = [];
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
        Server: $Enums.MaiServer
        MaiUserId: bigint
        MaiPassword: string
        MaiToken: string
        MaiFCode: string}): MaiAccount|undefined {
        try
        {
            let server = dbUser.Server == $Enums.MaiServer.CN ? MaiServer.CN :
                         dbUser.Server == $Enums.MaiServer.Intl ? MaiServer.Intl :
                         dbUser.Server == $Enums.MaiServer.JP ? MaiServer.JP : MaiServer.JP;
            let user = new MaiAccount(dbUser.Id,server);
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
    Level: Permission = Permission.Command

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
    checkPermission(targetLevel: Permission): boolean
    {
        if(this.Level >= targetLevel)
            return true;
        return false;
    }
    setPermission(targetLevel: Permission): void
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
                Level: this.Level == Permission.Unknown ? $Enums.Permission.Unknown :
                       this.Level == Permission.Command ? $Enums.Permission.Command :
                       this.Level == Permission.Advanced ? $Enums.Permission.Advanced :
                       this.Level == Permission.Admin ? $Enums.Permission.Admin :
                       this.Level == Permission.Root ? $Enums.Permission.Root : $Enums.Permission.Unknown
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
            user.Level = dbUser.Level == $Enums.Permission.Unknown ? Permission.Unknown :
                         dbUser.Level == $Enums.Permission.Command ? Permission.Command :
                         dbUser.Level == $Enums.Permission.Advanced ? Permission.Advanced :
                         dbUser.Level == $Enums.Permission.Admin ? Permission.Admin :
                         dbUser.Level == $Enums.Permission.Root ? Permission.Root : Permission.Unknown;
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