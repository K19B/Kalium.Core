import nodeBot, { Audio, Document, ParseMode, PhotoSize} from 'node-telegram-bot-api';
import * as color from './color';
import { $Enums, PrismaClient } from '@prisma/client';
import { BOTCONFIG, LOGNAME } from '../main';
import { YamlSerializer, file } from './config';
import { musicScore } from '../../kalium-vanilla-mai/class';
import internal from 'stream';

export enum logLevel {
    fatal = 9,
    error = 8,
    warn = 2,
    info = 1,
    debug = 0,
    slient = -1
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
export class maiData{
    id: number
    server: regMaiServer
    data: musicScore[]

    constructor(i: number,s: regMaiServer,d: musicScore[])
    {
        this.id = i;
        this.server = s;
        this.data = d;
    }
    makeData(): ({
        id: number,
        server: $Enums.regMaiServer
        data: string
    }) | undefined {
        let serverType: $Enums.regMaiServer[] = [$Enums.regMaiServer.JP,$Enums.regMaiServer.Intl,$Enums.regMaiServer.CN];
        return {
            id: this.id,
            server: serverType[this.server],
            data: YamlSerializer.serialize(this.data)
        };
    }
    convert(d: {
        id: number,
        server: $Enums.regMaiServer
        data: string
    }): maiData {
        let list = YamlSerializer.deserialize<musicScore[]>(d.data)
        let serverType: Map<$Enums.regMaiServer,regMaiServer> = new Map(
            [
                [$Enums.regMaiServer.JP,regMaiServer.JP],
                [$Enums.regMaiServer.Intl,regMaiServer.Intl],
                [$Enums.regMaiServer.CN,regMaiServer.CN]
            ]
        );
        let s = serverType.get(d.server);

        return new maiData(d.id,s!,list);
    }
}
export class cliCommand{
    content: string
    prefix: string
    constructor(content: string) {
        this.prefix = content.split(" ")[0]
        this.content = content;
    }
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
                || !file.appendText(`${BOTCONFIG?.core.logPath}/${LOGNAME}`,`${text}\n`) // write log fail
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
    lang: string | undefined

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
        return this.chat.type === "group" || this.chat.type === "supergroup";
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
            } 
            else if(content.charAt(0) != "/")
                pCommand = undefined;
            else {
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
            msg.lang = botMsg.from?.language_code;
            return msg;
        }
        catch {
            return undefined;
        }
    }
    private async canSend(): Promise<boolean> {
        if(this.client != undefined) {
            return true;
        } else if((await (this.client! as nodeBot).getMe()).id === Number(this.from.id)) {
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
        loginType: $Enums.maiLoginType
        maiId: string
        maiToken: string
        maiAlterId: string
        maiAlterToken: string
    }) | undefined {
        let serverType: $Enums.regMaiServer[] = [$Enums.regMaiServer.JP,$Enums.regMaiServer.Intl,$Enums.regMaiServer.CN];
        let loginType: $Enums.maiLoginType[] = [$Enums.maiLoginType.sega,$Enums.maiLoginType.netId,$Enums.maiLoginType.friend];
        try {
            return {
                id: this.id,
                server: serverType[this.server],
                loginType: loginType[this.loginType],
                maiId: this.maiId,
                maiToken: this.maiToken ?? "",
                maiAlterId: this.maiAlterId ?? "",
                maiAlterToken: this.maiAlterToken ?? ""
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
        id: number
        server: $Enums.regMaiServer
        loginType: $Enums.maiLoginType
        maiId: string
        maiToken: string
        maiAlterId: string
        maiAlterToken: string
    }): maiAccount|undefined {
        try
        {
            let serverType: Map<$Enums.regMaiServer,regMaiServer> = new Map(
                [
                    [$Enums.regMaiServer.JP,regMaiServer.JP],
                    [$Enums.regMaiServer.Intl,regMaiServer.Intl],
                    [$Enums.regMaiServer.CN,regMaiServer.CN]
                ]
            );
            let loginType: Map<$Enums.maiLoginType,maiLoginType> = new Map(
                [
                    [$Enums.maiLoginType.sega,maiLoginType.sega],
                    [$Enums.maiLoginType.netId,maiLoginType.netId],
                    [$Enums.maiLoginType.friend,maiLoginType.friend]
                ]
            );
            let user = new maiAccount(dbUser.id,serverType.get(dbUser.server)!);
            user.loginType = loginType.get(dbUser.loginType)!;
            user.maiAlterId = dbUser.maiAlterId;
            user.maiAlterToken = dbUser.maiAlterToken;
            user.maiId = dbUser.maiId;
            user.maiToken = dbUser.maiToken;
        
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
    id: bigint
    username: string
    firstname: string
    lastname: string
    level: permission = permission.default
    messageProcessed: number
    commandProcessed: number
    registered: Date
    lastSeen: Date

    constructor(id: bigint,
                username: string,
                fName: string,
                lName: string
    )
    {
        this.id = id;
        this.firstname = fName;
        this.lastname = lName;
        this.username = username;
    }
    getName(): string
    {
        return this.firstname + " " + this.lastname;
    }
    checkPermission(targetLevel: permission): boolean
    {
        if(this.level >= targetLevel)
            return true;
        return false;
    }
    update(u: User): void {
        this.firstname = u.firstname;
        this.username = u.username;
        this.lastname = u.lastname;
    }
    async setPermission(targetLevel: permission,db: PrismaClient): Promise<void>
    {
        this.level = targetLevel;
        await this.save(db);
    }
    async save(db: PrismaClient): Promise<void> {
        let data = this.makeData();
        
        if(data == undefined)
            return;
        if(await User.search(db,this.id) != undefined)
        {
            await db.user.update({
                where: {
                    id: this.id as bigint
                },
                data: data
            });
        }
        else
            await db.user.create({data: data});
    }
    makeData(): ({
        id: bigint
        username: string
        firstname: string
        lastname: string
        level: $Enums.permission
        messageProcessed: number
        commandProcessed: number
        registered: Date
        lastSeen: Date})|undefined
    {
        try
        {
            let permissions: Map<permission,$Enums.permission> = new Map(
                [
                    [permission.disabled,$Enums.permission.disabled],
                    [permission.default,$Enums.permission.default],
                    [permission.whiteListed,$Enums.permission.whiteListed],
                    [permission.admin,$Enums.permission.admin],
                    [permission.owner,$Enums.permission.owner]
                ]
            );
            return {
                id: this.id,
                username : this.username,
                firstname: this.firstname,
                lastname: this.lastname,
                level: permissions.get(this.level)!,
                messageProcessed: this.messageProcessed,
                commandProcessed: this.commandProcessed,
                registered: this.registered,
                lastSeen: this.lastSeen
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
    static async search(db: PrismaClient,id: BigInt): Promise<User|undefined> {
        let result: User|undefined = undefined;
        let r = await db.user.findUnique({
            where: {
                id : id as bigint
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
        id: bigint
        username: string
        firstname: string
        lastname: string
        level: $Enums.permission
        messageProcessed: number
        commandProcessed: number
        registered: Date
        lastSeen: Date}): User|undefined {
        try
        {
            let permissions: Map<$Enums.permission,permission> = new Map(
                [
                    [$Enums.permission.disabled,permission.disabled],
                    [$Enums.permission.default,permission.default],
                    [$Enums.permission.whiteListed,permission.whiteListed],
                    [$Enums.permission.admin,permission.admin],
                    [$Enums.permission.owner,permission.owner]
                ]
            );
            let user = new User(dbUser.id,
                dbUser.username,
                dbUser.firstname,
                dbUser.lastname);
            user.level = permissions.get(dbUser.level)!
            user.messageProcessed = dbUser.messageProcessed;
            user.commandProcessed = dbUser.commandProcessed;
            user.registered = dbUser.registered;
            user.lastSeen = dbUser.lastSeen;
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

        return new User(BigInt(id), username, fName, lName);
    }
}
