import nodeBot, { Audio, Document, ParseMode, PhotoSize } from 'node-telegram-bot-api';
import * as color from './lib/color';

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
export class LogManager
{
    static Debug(content :string,level :DebugType = DebugType.Info) :void
    {
        switch(level)
        {
            case DebugType.Debug:
                console.log(color.bBlack + color.fWhite + ' DEBUG ' + color.reset + color.core + content);
            break;
            case DebugType.Info:
                console.log(color.core + content);
            break;
            case DebugType.Warning:
                console.log(color.bYellow + color.fBlack + ' WARNING ' + color.reset + content);
            break;
            case DebugType.Error:
                console.log(color.bRed + color.fBlack + ' ERROR ' + color.reset + content);
            break;
        }
    }
}
export class Message{
    Id: number
    From: nodeBot.User
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
        this.From = from;
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
        else if((await (this.Client! as nodeBot).getMe()).id === this.From.id)
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
export class User
{
    Id: number
    Username: string
    Firstname: string
    Lastname: string
    Level: Permission = Permission.Command

    MaiUserId: number|undefined
    MaiPassword: string|undefined
    MaiToken: string|undefined
    MaiFCode: string|undefined

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