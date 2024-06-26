import * as os from 'os';
import nodeBot from 'node-telegram-bot-api';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { maiRankJp } from '../kalium-vanilla-mai/main';
import * as color from './lib/color';
import { logger, message, command, Chat, logLevel, rendering, cliCommand, permission } from './lib/class';
import { PrismaClient } from '@prisma/client';
import { arcRtnCalc } from 'kalium-vanilla-arc';
import { config } from './lib/config';
import { format } from 'date-fns';
import { exit } from 'process';
import { dbUrl } from './lib/prisma';
import * as tsfetch from 'tsfetch-re';

export const BOTCONFIG: config | undefined = config.parse('config.yaml');
export const LOGNAME = `${format(Date(),"yyyy-MM-dd HH-mm-ss")}.log`;

const VER = process.env.npm_package_version;
const PLATFORM = os.platform();
const STARTTIME: string = Date();
const KERNEL = PLATFORM === 'linux'?  execFileSync('uname', ['-sr']).toString() :"NotSupport";
const DB = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl(),
      },
    },
});
const 白丝Id = '3129e55c7db031e473ce3256b8f6806a8513d536386d30ba2fa0c28214c8d7e4b3385051dee90d5a716c6e4215600be0be3169f7d3ecfb357b3e2b6cb8c73b68H6MMqPZtVOOjD%2FxkMZMLmnqd6sH9jVYK1VPcCJTKnsU%3D';
const PERMISSION = new Map([
    [-1, rendering(color.fBlack,color.bWhite, " Disabled ")],
    [0,  rendering(color.fBlack,color.bWhite, " Default  ")],
    [1,  rendering(color.fWhite,color.bBlue,  " WListed  ")],
    [2,  rendering(color.fPurple,color.bBlack,"  Admin   ")],
    [19,rendering(color.fRed,color.bBlack,    "  Owner   ")],
]);

// Kalium CLI
process.stdin.on('data', (data: Buffer) => {
    let key = new cliCommand(data.toString().trim());
    switch(key.prefix)
    {
        case "KINTERNALLOADERQUIT":
            logger.debug('Core exiting... (Rcvd \'KINTERNALLOADERQUIT\' command)');
            process.exit();
        case "SEND":
            console.log(key);
            if (key.content.split(" ")[2]) {
                let msg = '```Kalium-CLI-Message\n' + key.content.split(" ").slice(2).join(" ") + '\n```';
                message.send(bot, parseInt(key.content.split(" ")[1]), msg)
            }
        break;
    }
});

logger.debug(' Kalium ' + VER);  
logger.debug("");         
if(BOTCONFIG == null)
{
    logger.debug(" Read config failure",logLevel.error);
    exit();
}
else if (BOTCONFIG.login.tokenT  == null)
{
    logger.debug(" Telegram bot token not found",logLevel.error);
    exit();
}
logger.debug(` Config version: v${BOTCONFIG.core.confVer}`);
logger.debug(' All checks passed.');
let bot = new nodeBot(BOTCONFIG?.login.tokenT as string, 
    {
        polling: true
    });
bot.onText(/[\s\S]*/,messageHandle);

logger.debug(' Bot core started.\n');


// Receive Messages
async function messageHandle(botMsg: nodeBot.Message,resp: RegExpExecArray | null): Promise<void> {
    try {
        const USERNAME: string = (await bot.getMe()).username as string;
        let Commands = await bot.getMyCommands();
        let msg: message | undefined = message.parse(bot, botMsg);
        let recHeader = `${rendering(color.fWhite, color.bBlue, " RECV ")}`;
        let reqHeader = `${rendering(color.fBlack, color.bPurple, " UREQ ")}`;
        if (msg == undefined) return;

        if (msg.isGroup)
            logger.debug(recHeader +
                `${rendering(color.bGreen, color.fBlack, ` C:${msg.chat.id} U:${msg.from.name}(${msg.from.id}) `)}` +
                ` ${msg.text ?? "EMPTY"}`);
        else
            logger.debug(recHeader +
                `${rendering(color.bGreen, color.fBlack, ` U:${msg.from.name}(${msg.from.id}) `)}` +
                ` ${msg.text ?? "EMPTY"}`);

        // Telegram User infomation update
        let u = await Chat.search(DB, msg.from.id);
        let chat = await Chat.search(DB,msg.chat.id);
        let now = new Date();
        if (u != undefined) {
            u.update(msg.from);
            msg.from = u;
        }
        else // If null, then new user
            msg.from.commandEnable = Commands.map( x => x.command);

        if(chat != undefined)
        {
            if(msg.chat.id == msg.from.id && u != undefined)
                msg.chat = u;
            else(msg.chat.id != msg.from.id)
            {
                chat.update(msg.chat);
                msg.chat = chat;
            }
        }
        else // If null, then new group
            msg.chat.commandEnable = Commands.map( x => x.command);

        msg.from.lastSeen = now;
        msg.chat.lastSeen = now;

        if (!msg.from.messageProcessed) {
            msg.from.registered = now;
            msg.from.messageProcessed = 0;
            msg.from.commandProcessed = 0;
        }
        if(msg.chat.id != msg.from.id)
            msg.chat.messageProcessed++;
        msg.from.messageProcessed++;
        
        // Reference checker
        if (msg.command == undefined) {
            await msg.from.save(DB);
            return;
        }
        else if (msg.command.prefix.includes("@")) {
            let _prefix = msg.command.prefix.split("@");
            if (msg.isGroup) {
                if (_prefix[1] != USERNAME) {
                    await msg.from.save(DB);
                    return;
                }
            }
            msg.command.prefix = _prefix[0];
        }
        logger.debug(reqHeader +
            PERMISSION.get(msg.from.level)! +
            ` PF:${msg.command.prefix} PR: ${msg.command.content.join(" ")}`, logLevel.debug);
        if(msg.chat.id != msg.from.id)
            msg.chat.commandProcessed++;
        msg.from.commandProcessed++;
        await msg.from.save(DB);
        await commandHandle(msg);
    }
    catch(e:any)
    {
        logger.debug(` ${e.message ?? e}`,logLevel.fatal)
    }
}

// Bot Commands
async function commandHandle(msg: message): Promise<void> {
    let command = msg.command!;
    let supportCmds = (await bot.getMyCommands()).map(x => x.command.replace("/",""));
    //let user = msg.from;

    if(msg.isGroup)
    {
        let chat = msg.chat;
        if (chat.commandEnable?.length == 0) {
            chat.registered = new Date();
            chat.commandEnable = supportCmds;
            chat.save(DB);
        }
        else if (!chat.canExecute(command.prefix,msg))
            return;
    }
    
    switch(command.prefix) {
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
        case "kset":
            groupSetting(msg);
        break;
    }
}
function getUserInfo(msg: message): void {
    let p = new Map([
        [-1, "Disabled"],
        [0,  "Default "],
        [1, "WListed"],
        [2, "Admin"],
        [19,"Owner"],
    ])
    let userId = msg.from.id;
    let resp = 'Kalium User Info\n```\n' + 
                `- Basic\n`+
                `name      : ${msg.from.name}\n`+
                `id        : ${userId}\n`+
                `${msg.isPrivate ? `lang      : ${msg.lang}\n`:``}`+
                `perm      : ${p.get(msg.from.level)}\n\n`+
                `- Stat\n`+
                `Proced MSG: ${msg.from.messageProcessed}\n`+
                `Proced MSG: ${msg.from.commandProcessed}\n`+
                `Register  : ${msg.from.registered ? format(msg.from.registered,"yyyy-MM-dd HH:mm:ss") : "Unavailable"}` +
               '\n```';
    msg.reply(resp);
}
function checkAlive(msg: message): void {
    let userId = msg.from.id;
    let resp = 'Kalium is alive.\nServer time: ' + Date();
    msg.reply(resp);
}
function getBotStatus(msg: message): void {
    let userId = msg.from.id;
    let resp = 'Kalium Bot v' + VER + ' Status\n' +
                '```\n' + tsfetch.fetch() + '```\n'
                + new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';;
    msg.reply(resp);
}
function wolHandle(msg: message): void {
    let userId = msg.from.id; 
    if(userId == BigInt(1613650110)) {
        let resp = '`' + exec('wakeonlan', ['08:bf:b8:43:30:15']) + '`';
        msg.reply(resp);
    }
    else {
        msg.reply("Permission Denied");
    }
}
function fuckZzy(msg: message): void {
    message.forward(bot,"@MBRFans",msg.chat.id.toString(),374741);
}
function netQuery(msg: message): void {
    let domain = msg.command?.content.join(" ") as string;
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
function groupSetting(msg: message): void {

    // /kset cmd +<cmd>  add new cmd to group allowCmds
    // /kset cmd -<cmd>  remove a cmd from group allowCmds

    let cmd = msg.command!;
    if(msg.isPrivate) {
        msg.reply("This command can only be used within the group");
        return;
    }
    else if (!msg.from.checkPermission(permission.admin)) {
        msg.reply("Permission Denied");
        return;
    }
    else if(cmd.content.length < 1) {
        msg.reply("Invaild param");
        return;
    }
    let prefix = cmd.content[0];
    let cmdManager = async (msg: message) => {
        let cmd = msg.command!;
        if(cmd.content.length < 2 || cmd.content[1].length < 2) {
            msg.reply("Invaild param");
            return;
        }
        let op = cmd.content[1][0];
        let uCmd = cmd.content[1].slice(1,cmd.content[1].length - 1);
        let botSupprort = (await bot.getMyCommands()).map( x => x.command);

        if(!botSupprort.includes(uCmd)) {
            msg.reply("Invaild command");
            return;
        }
        let group = msg.from;
        if(op == "-" && group.commandEnable!.includes(uCmd))
            group.commandEnable = group.commandEnable?.filter( x => x != uCmd);
        else if (op == "-" && !group.commandEnable!.includes(uCmd))
            group.commandEnable!.push(uCmd);
        await group.save(DB);
        msg.reply("Success");
    };

    switch(prefix)
    {
        case "cmd":
            cmdManager(msg);
        break;
    }
}

// Kalium Bot Functions
function serverTime() {
    let svt = new Date().toLocaleString("en-CA", {timeZone: "UTC", hour12: false});
    return svt;
}
function log(type: string, lvl: string, data: string) {
    // Deprecated by new logger, will remove later.
    let logdata = serverTime() + ' ' + type + ' ' + lvl + ' ' + data + '\n';
    fs.writeFile(LOGNAME, logdata, { flag: 'a+' }, err => {});
}
function exec(path: string, args: string[]) {
    logger.debug('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', e as string);
    }
}
function secureExe0c(path: string, args: string[]) {
    logger.debug('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', 'Is the token valid?');
    }
}
function fwrd(id: any, src: any, msgid: number) {
    logger.debug('\x1b[43m FWRD \x1b[42m ' + id + ' \x1b[0m ' + src + "/" + msgid);
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

function maiSetId(msg: message): void
{
    maisegaId = msg.command?.content[1];
    msg.reply("OK");
}
function maiSetP(msg: message): void
{
    maiPasswd = msg.command?.content[1];
    msg.reply("OK");
}
async function maiRank(msg: message): Promise<void>
{
    if(!maisegaId || !maiPasswd) {
        let result = "你还没有设置 DX Net 登录凭据哇！\n使用 /setid 和 /setp 登录！"
        msg.reply(result);
    } else {
        let data = await maiRankJp(白丝Id, maisegaId, maiPasswd);
        if(!data || data.length < 3)
        {
            msg.reply("```\nEMPTY\n```");
            return;
        }
        let result = `[1] ${data[0].ranker}\n
                      ${data[0].score}\n
                      [2] ${data[1].ranker}\n
                      ${data[1].score}\n
                      [3] ${data[2].ranker}\n
                      ${data[2].score}\n`;
        msg.reply("```\n" + result + "\n```");
    }
}
function maiUpdate(msg: message): void
{
    let userId = msg.from.id;
    if (userId == BigInt(1613650110)) {
        let resp = '```Result\n' + exec('git', ['pull']) + '```';
        msg.reply(resp)
    } else {
        msg.reply("Premission denied.");
    }
}
function arcCalc(msg: message): void
{
    let input = msg.command?.content;
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
