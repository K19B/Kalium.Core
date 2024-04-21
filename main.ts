import * as os from 'os';
import nodeBot from 'node-telegram-bot-api';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { maiRankJp } from './plugin/kalium-vanilla-mai/main';
import * as color from './lib/color';
import { LogManager,Message,Command, User, DebugType, rendering } from './lib/class';
import { PrismaClient } from '@prisma/client';
import { arcRtnCalc } from 'kalium-vanilla-arc';
import { config } from './lib/config';
import { format } from 'date-fns';
import { exit } from 'process';


const VER = process.env.npm_package_version;
const PLATFORM = os.platform();
export const BOTCONFIG :config|undefined = config.parse('config.yaml');
const STARTTIME :string = Date();
const KERNEL = PLATFORM === 'linux'?  execFileSync('uname', ['-sr']).toString() :"NotSupport";
export const LOGNAME = `${format(Date(),"yyyy-MM-dd HH-mm-ss")}.log`;
const DB = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://${BOTCONFIG?.database.username}:${BOTCONFIG?.database.password}@${BOTCONFIG?.database.host}:${BOTCONFIG?.database.port}/${BOTCONFIG?.database.db}`,
      },
    },
});
const 白丝Id = '3129e55c7db031e473ce3256b8f6806a8513d536386d30ba2fa0c28214c8d7e4b3385051dee90d5a716c6e4215600be0be3169f7d3ecfb357b3e2b6cb8c73b68H6MMqPZtVOOjD%2FxkMZMLmnqd6sH9jVYK1VPcCJTKnsU%3D';
const PERMISSION = new Map([
    [-1, rendering(color.fBlack,color.bWhite, " Unknown  ")],
    [0,  rendering(color.fBlack,color.bWhite, " Ban      ")],
    [1,  rendering(color.fWhite,color.bBlue,  " Common   ")],
    [2,  rendering(color.fPurple,color.bBlack," Advanced ")],
    [3,  rendering(color.fYellow,color.bBlack," Admin    ")],
    [999,rendering(color.fRed,color.bBlack,   " Root    ")],
]);

// Whats this -- LeZi
process.stdin.on('data', (data: Buffer) => {
    let key = data.toString().trim();
    if (key === 'KINTERNALLOADERQUIT') {
        LogManager.Debug('Core exiting... (Rcvd \'KINTERNALLOADERQUIT\' command)');
        process.exit();
    }
});

LogManager.Debug(' Kalium ' + VER);  
LogManager.Debug("");         
if(BOTCONFIG == null)
{
    LogManager.Debug(" Read config failure",DebugType.Error);
    exit();
}
else if (BOTCONFIG.login.tokenT  == null)
{
    LogManager.Debug(" Telegram bot token not found",DebugType.Error);
    exit();
}
LogManager.Debug(` Config version: v${BOTCONFIG.core.confVer}`);
LogManager.Debug(' All checks passed.');

let bot = new nodeBot(BOTCONFIG?.login.tokenT as string, {polling: true});
bot.onText(/[\s\S]*/,messageHandle);

LogManager.Debug(' Bot core started.\n');


// Receive Messages
async function messageHandle(botMsg: nodeBot.Message,resp: RegExpExecArray | null): Promise<void>
{
    const USERNAME: string = (await bot.getMe()).username as string;
    let Commands = await bot.getMyCommands();
    let msg: Message| undefined = Message.parse(bot,botMsg);
    let recHeader = `${rendering(color.fWhite,color.bBlue," RECV ")}`;
    let reqHeader = `${rendering(color.fBlack,color.bPurple," UREQ ")}`;
    if(msg == undefined) return;

    if(msg.isGroup())
        LogManager.Debug(recHeader + 
                         `${rendering(color.bGreen,color.fBlack,` C:${msg.Chat.id} U:${msg.From.getName()}(${msg.From.Id}) `)}`  + 
                         ` ${msg.Text ?? "EMPTY"}`);
    else
        LogManager.Debug(recHeader + 
                         `${rendering(color.bGreen,color.fBlack,` U:${msg.From.getName()}(${msg.From.Id}) `)}`  + 
                         ` ${msg.Text ?? "EMPTY"}`);

    // 用户信息更新
    let u = await User.search(DB,msg.From.Id);
    if(u != undefined)
        msg.From.Level = u.Level;
    msg.From.save(DB);
    // 引用检查
    if(msg.Command == undefined)
        return;
    if(msg.isGroup())
    {
        if(!msg.Command.Prefix.includes(USERNAME as string))
            return;
        else if(msg.Command.Prefix.split("@")[1] != (USERNAME as string))
            return
    }
    LogManager.Debug(reqHeader + 
                     PERMISSION.get(msg.From.Level)!  + 
                     ` PF:${msg.Command.Prefix} PR: ${msg.Command.Content.join(" ")}`,DebugType.Debug)

    let commands = Commands.map(x => x.command);
    let prefix = msg.Command.Prefix.split("@")[0];
    if(!commands.includes(prefix))    
    {
        LogManager.Debug("Bot unsupport,skip...");
        return;
    }
    commandHandle(msg);
}

// Bot Commands
function commandHandle(msg: Message): void
{
    let command = msg.Command as Command;
    switch(command.Prefix)
    {
        case "userinfo":
            getUserInfo(msg);
        break;
        case "kping":
            checkAlive(msg);
        break;
        case "status":
            getBotStatus(msg);
        break;
        case "wol":
            wolHandle(msg);
        break;
        case "来玉林北流":
            fuckZzy(msg);
        break;
        case "check":
            netQuery(msg);
        break;
        case "setid":
            maiSetId(msg);
        break;
        case "setp":
            maiSetP(msg);
        break;
        case "rank":
            maiRank(msg);
        break;
        case "kupdate":
            maiUpdate(msg);
        break;
        case "karcCalc":
            arcCalc(msg);
        break;
    }
}
function getUserInfo(msg: Message): void
{
    let userId = msg.From.Id;
    let resp = 'Kalium User Info\n```\nID: ' + userId +
               '\n```' + Date();
    msg.reply(resp);
}
function checkAlive(msg: Message): void
{
    let userId = msg.From.Id;
    let resp = 'Kalium is alive.\nServer time: ' + Date();
    msg.reply(resp);
}
function getBotStatus(msg: Message): void
{
    let userId = msg.From.Id;
    let resp = 'Kalium Bot v' + VER + ' Status\n' +
                '```\n' + exec('bash', ['neofetch', '--stdout']) + '```\n'
                + Date();
    msg.reply(resp);
}
function wolHandle(msg: Message): void
{
    let userId = msg.From.Id; 
    if(userId == 1613650110)
    {
        let resp = '`' + exec('wakeonlan', ['08:bf:b8:43:30:15']) + '`';
        msg.reply(resp);
    }
    else
        msg.reply("Permission Denied");
}
function fuckZzy(msg: Message): void
{
    fwrd(msg.Chat.id, "@MBRFans", 374741);
}
function netQuery(msg: Message): void
{
    let domain = msg.Command?.Content.join(" ") as string;
    var checkFqdn = 'FQDN not detected\n';
    var checkUrl = 'URL not detected';
    // Part I: Check FQDN
    let fqdn = domain.match(/(((?!-))(xn--|_)?[a-z0-9-]{0,61}[a-z0-9]{1,1}\.)+(xn--)?([a-z0-9][a-z0-9\-]{0,60}|[a-z0-9-]{1,30}\.[a-z]{2,})/);
    if (fqdn == null) {
        var checkFqdn = 'FQDN not detected\n';
    } else {
        let fqdnLookup = exec('nslookup', [fqdn[0], 'mbr.moe']);
        var checkFqdn = 'FQDN Detected\n```nslookup\n' + fqdnLookup + '\n```\n';
    }
    // Part II: Check URL
    let url = domain.match(/(?<protocol>https?):\/\/(?<domain>(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?)|(\[(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\])))(:(?<port>([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])))?(?<path>\/[a-zA-Z0-9\-\._~:\/\?#\[\]@!\$&'\(\)\*\+,;=]*)?/gusi);
    if (url == null) {
        var checkUrl = 'URL not detected';
        //send(msg.chat.id, 'Invalid');
    } else {
        let curlHeader = exec('curl', ['-IsSL', url[0]]);
        var checkUrl = 'URL Detected\n```curl\n' + curlHeader + '\n```\n';
        //send(msg.chat.id, resp);
    }
    // Finish Check
    msg.reply(checkFqdn + checkUrl);
}

// Kalium Bot Functions
function serverTime() {
    let svt = new Date().toLocaleString("en-CA", {timeZone: "UTC", hour12: false});
    return svt;
}
function log(type: string, lvl: string, data: string) { // Deprecated, will remove later.
    let logdata = serverTime() + ' ' + type + ' ' + lvl + ' ' + data + '\n';
    fs.writeFile(LOGNAME, logdata, { flag: 'a+' }, err => {});
}
function exec(path: string, args: string[]) {
    LogManager.Debug('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', e as string);
    }
}
function secureExec(path: string, args: string[]) {
    LogManager.Debug('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', 'Is the token valid?');
    }
}
function fwrd(id: any, src: any, msgid: number) {
    LogManager.Debug('\x1b[43m FWRD \x1b[42m ' + id + ' \x1b[0m ' + src + "/" + msgid);
    log('FWRD', 'INFO  ', id + ' | ' + src + "/" + msgid);
    bot.forwardMessage(id, src, msgid, );
}
function err(from: string, stderr: string) {
    log(from, 'ERROR ', from + ' called error function.')
    return '[ stderr detected ]' + '\n' +
           stderr + '\n' +
           '---' + '\n' +
           'Kalium ' + VER + ', Kernel ' + KERNEL;
}



// Mai Rank Handler
let maisegaId: undefined | string;
let maiPasswd: undefined | string;

function maiSetId(msg: Message): void
{
    maisegaId = msg.Command?.Content[1];
    msg.reply("OK");
}
function maiSetP(msg: Message): void
{
    maiPasswd = msg.Command?.Content[1];
    msg.reply("OK");
}
async function maiRank(msg: Message): Promise<void>
{
    if(!maisegaId || !maiPasswd) {
        let result = "你还没有设置 DX Net 登录凭据哇！\n使用 /setid 和 /setp 登录！"
        msg.reply(result);
    } else {
        let result = await maiRankJp(白丝Id, maisegaId, maiPasswd);
        msg.reply("```\n" + result + "\n```");
    }
}
function maiUpdate(msg: Message): void
{
    let userId = msg.From.Id;
    if (userId == 1613650110) {
        let resp = '```Result\n' + exec('git', ['pull']) + '```';
        msg.reply(resp)
    } else {
        msg.reply("Premission denied.");
    }
}
function arcCalc(msg: Message): void
{
    let input = msg.Command?.Content;
    let err = '```Usage\n/karc calc <lvl> <score>\n\nExamples:\n/karc calc 11 950\n/karc calc 9.7 9921930```';
    if(!input || !input[3]) {
        msg.reply(err)
    } else {
        try {
            msg.reply('```Result\n' + arcRtnCalc(parseFloat(input[2]), parseInt(input[3])) + '```');
        } catch {
            msg.reply(err);
        }
    }
}
