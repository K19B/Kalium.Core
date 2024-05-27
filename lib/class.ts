import nodeBot, { Audio, Document, ParseMode, PhotoSize} from 'node-telegram-bot-api';
import * as color from './color';
import { $Enums, PrismaClient, chat } from '@prisma/client';
import { BOTCONFIG, LOGNAME } from '../main';
import { YamlSerializer, file } from './config';
import { musicScore } from '../../kalium-vanilla-mai/class';
import { title } from 'process';

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
export enum chatType{
    PRIVATE,
    GROUP,
    SUPER_GROUP,
    CHANNEL
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
    from: Chat
    chat: Chat
    text: string | undefined
    audio: Audio | undefined
    document: Document | undefined
    photo: PhotoSize[] | undefined
    command: command | undefined
    client: nodeBot | undefined
    lang: string | undefined


    constructor(id: number, from: nodeBot.User, chat: Chat, command: command | undefined)
    {
        this.id = id;
        this.from = new Chat(BigInt(from.id),from.username ?? "",from.first_name,from.last_name,undefined);
        this.from.title = chat.title;
        this.from.type = chatType.PRIVATE;
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
    
    get isPrivate(){
        return this.chat.type === chatType.PRIVATE;
    }
    // If chat is Group or SuperGroup,return true
    get isGroup(){
        return this.chat.type === chatType.GROUP || this.chat.type === chatType.SUPER_GROUP;
    }
    get isChannel(){
        return this.chat.type === chatType.CHANNEL;
    }
    // Send a new message and reply
    // Return: Sended message
    async reply(text: string,
                parseMode: ParseMode = "Markdown"): Promise<message| undefined>
    {
        let msg = await this.client!.sendMessage(this.chat.id.toString(), text, { parse_mode: parseMode, reply_to_message_id: this.id });

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
                                                               chat_id: this.chat.id.toString(),
                                                               message_id: this.id }) as nodeBot.Message

        return message.parse(this.client!,msg);
    }
    // Delete this message
    // If you aren't this message sender or no have corresponding authority,this action will make a error
    // Return: If success,return true
    async delete(): Promise<boolean>
    {
        return await this.client?.deleteMessage(this.chat.id.toString(),this.id)!;
    }
    async forward(desChat: string|number): Promise<message| undefined>
    {
        if(!this.client)
            return undefined;

        let msg = await this.client?.forwardMessage(desChat,this.chat.id.toString(),this.id);

        if(!msg)
            return undefined;
        return message.parse(this.client,msg);
    }
    // Send a message without reply
    // Return: Sended message
    async send(text: string,
               parseMode: ParseMode = "Markdown"): Promise<message| undefined> 
    {
        let msg = await this.client!.sendMessage(this.chat.id.toString(), text, { parse_mode: parseMode })

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
    static async forward(client: nodeBot,
                         srcChatId: string| number,
                         desChatId: string| number,
                         msgId: number): Promise<message| undefined>{
        if (!client)
            return undefined;

        let msg = await client?.forwardMessage(desChatId, srcChatId, msgId);

        if (!msg)
            return undefined;
        return message.parse(client, msg);
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
            let msg = new message(botMsg.message_id, botMsg.from!, Chat.parse(botMsg.chat)!, pCommand)
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
    id: bigint
    server: regMaiServer
    loginType: maiLoginType
    maiId: string
    maiToken: string | undefined
    maiAlterId: string | undefined
    maiAlterToken: string | undefined

    constructor(id: bigint,server: regMaiServer){
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
        id: bigint
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
    static async search(db: PrismaClient,id: bigint,server: regMaiServer): Promise<maiAccount|undefined> {
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
        id: bigint
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
export class Chat
{
    id: bigint
    username: string
    type: chatType

    firstname: string| undefined = undefined;
    lastname: string| undefined = undefined;
    title: string|undefined = undefined;
    
    level: permission = permission.default

    registered: Date|undefined = undefined;
    lastSeen: Date|undefined = undefined;

    messageProcessed: number = 0;
    commandProcessed: number = 0 ;
    commandEnable: string[]|undefined = undefined;

    constructor(id: bigint,
                username: string,
                fName: string| undefined,
                lName: string| undefined,
                title: string| undefined
    )
    {
        this.id = id;
        this.firstname = fName ?? "";
        this.lastname = lName ?? "";
        this.username = username;
        this.title = title;
    }
    get name(): string
    {
        return this.title ?? this.firstname + " " + this.lastname;
    }
    update(u: Chat): void {
        this.firstname = u.firstname;
        this.username = u.username;
        this.lastname = u.lastname;
        this.title = u.title;
    }
    addCmd(cmd: string): void {
        if (!this.commandEnable)
            return;
        else if (this.commandEnable.includes(cmd))
            return;

        this.commandEnable.push(cmd);
    }
    delCmd(cmd: string): void {
        if (!this.commandEnable)
            return;
        else if (!this.commandEnable.includes(cmd))
            return;

        this.commandEnable = this.commandEnable.filter(x => x != cmd);
    }
    canExecute(cmd: string,msg: message): boolean {
        if (!this.commandEnable)
            return false;
        else
            return this.commandEnable.includes(cmd) || msg.isPrivate;
    }
    checkPermission(targetLevel: permission): boolean
    {
        if(this.level >= targetLevel)
            return true;
        return false;
    }
    async setPermission(targetLevel: permission,db: PrismaClient): Promise<void>
    {
        this.level = targetLevel;
        await this.save(db);
    }
    makeData(): ({
        id: bigint
        username: string
        firstname: string| null
        lastname: string| null
        title: string| null
        type: $Enums.chatType
        level: $Enums.permission
        messageProcessed: number
        commandProcessed: number
        registered: Date
        lastSeen: Date
        commandEnabled: string[]|undefined})|undefined
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
            let m = new Map<chatType,$Enums.chatType>([
                [chatType.CHANNEL,$Enums.chatType.channel],
                [chatType.GROUP,$Enums.chatType.group],
                [chatType.PRIVATE,$Enums.chatType.private],
                [chatType.SUPER_GROUP,$Enums.chatType.superGroup]
            ])
            return {
                id: this.id,
                username : this.username,
                firstname: this.firstname ?? "",
                lastname: this.lastname ?? "",
                type: m.get(this.type)!,
                title: this.title ?? null,
                level: permissions.get(this.level)!,
                messageProcessed: this.messageProcessed,
                commandProcessed: this.commandProcessed,
                registered: this.registered!,
                lastSeen: this.lastSeen!,
                commandEnabled: this.commandEnable
            };
        }
        catch
        {
            return undefined;
        }
    }
    async save(db: PrismaClient): Promise<void> {
        let data = this.makeData();
        
        if(data == undefined)
            return;
        if(await Chat.search(db,this.id) != undefined)
        {
            await db.chat.update({
                where: {
                    id: this.id as bigint
                },
                data: data
            });
        }
        else
            await db.chat.create({data: data});
    }
    static convert(dbUser: {
        id: bigint
        username: string
        firstname: string| null
        lastname: string| null
        title: string| null
        type: $Enums.chatType
        level: $Enums.permission
        messageProcessed: number
        commandProcessed: number
        registered: Date
        lastSeen: Date
        commandEnabled: string[]|undefined}): Chat|undefined {
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
            let m = new Map<$Enums.chatType,chatType>([
                [$Enums.chatType.channel,chatType.CHANNEL],
                [$Enums.chatType.group,chatType.GROUP],
                [$Enums.chatType.private,chatType.PRIVATE],
                [$Enums.chatType.superGroup,chatType.SUPER_GROUP]
            ])
            let chat = new Chat(dbUser.id,
                dbUser.username,
                dbUser.firstname ?? "",
                dbUser.lastname ?? "",
                dbUser.title ?? undefined);
            chat.level = permissions.get(dbUser.level)!;
            chat.type = m.get(dbUser.type)!;
            chat.messageProcessed = dbUser.messageProcessed;
            chat.commandProcessed = dbUser.commandProcessed;
            chat.registered = dbUser.registered;
            chat.lastSeen = dbUser.lastSeen;
            chat.commandEnable = dbUser.commandEnabled;
            return chat;  
        }
        catch
        {
            return undefined;
        }
    }
    static async where(db: PrismaClient,func:(x: Chat) => boolean): Promise<Chat[]> {
        let result: Chat[] = await this.all(db);

        return result.filter(func);
    }
    static async select<T>(db: PrismaClient,func:(x: Chat) => T): Promise<T[]> {
        let Chats = await this.all(db);

        return Chats.map(func);
    }
    static async search(db: PrismaClient,id: bigint): Promise<Chat|undefined> {
        let result: Chat|undefined = undefined;
        let r = await db.chat.findUnique({
            where: {
                id : id as bigint
            }
        });
        if(r != undefined)
            result = this.convert(r);
        return result;
    }
    static async all(db: PrismaClient): Promise<Chat[]> {
        let result: Chat[] = [];
        let r = await db.chat.findMany()
        r.forEach(y => {
            let u = this.convert(y);
            if(u != undefined)
                result.push(u);                
        })
        return result;
    }
    static parse(chat: nodeBot.Chat|undefined): Chat| undefined{
        if(!chat)
            return undefined;

        let id = chat.id;
        let fName = chat.first_name ?? "";
        let lName = chat.last_name ?? "";
        let username = chat.username ?? "";
        let title = chat.title;


        let result = new Chat(BigInt(id),username,fName,lName,title);
        let m = new Map<nodeBot.ChatType,chatType>(
        [
            ["private",chatType.PRIVATE],
            ["channel",chatType.CHANNEL],
            ["group",chatType.GROUP],
            ["supergroup",chatType.SUPER_GROUP]
        ]); 
        result.type = m.get(chat.type)!;
        return result;
    }
}
