import * as os from 'os';
import { Bot, InputFile } from 'grammy';
import type { Message } from 'grammy/types';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { maiRankJp, maiInfoJp, getPlayerHomeJp, fetchB50ScoreTablesForUserJp, buildBest50Entries, warmJacketCache, warmDxStarCache } from './plugin/kalium-vanilla-mai/main';
import type { b50Entry, difficultyScore } from './plugin/kalium-vanilla-mai/main';
import { generateB50Image, generatePlaceholder } from './plugin/kalium-vanilla-mai/imgGen';
import * as color from './lib/color';
import { logger, message, command, Chat, logLevel, rendering, cliCommand, permission, maiAccount, regMaiServer, maiLoginType } from './lib/class';
import { PrismaClient } from '@prisma/client';
import { arcRtnCalc } from 'kalium-vanilla-arc';
import { config } from './lib/config';
import { format } from 'date-fns';
import { exit } from 'process';
import { dbUrl } from './lib/prisma';
import { getSystemProxy } from './lib/proxy';
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
let proxyUrl = getSystemProxy();
let botConfig: any = {};
if (proxyUrl) {
    logger.debug(` Using system proxy: ${proxyUrl}`);
    botConfig.client = { baseFetchConfig: { agent: new HttpsProxyAgent(proxyUrl) } };
}
let bot = new Bot(BOTCONFIG?.login.tokenT as string, botConfig);

bot.on('message', ctx => messageHandle(ctx.message!));
bot.catch(err => logger.debug(` ${err.error ?? err.message}`, logLevel.fatal));

logger.debug(' Bot core started.\n');

function logOutbound(kind: 'SEND' | 'EDIT', chatId: string | number, text: string | undefined, hasPhoto = false, user?: { name: string; id: bigint }): void {
    const firstLine = (text ?? '').split(/\r?\n/, 1)[0].replace(/\s+/g, ' ').trim();
    const summary = hasPhoto ? (firstLine ? `[PIC] ${firstLine}` : '[PIC]') : (firstLine || '[EMPTY]');
    const target = user && user.id.toString() === chatId.toString()
        ? `U:${user.name} (${user.id})`
        : `C:${chatId}`;
    const kindLabel = kind === 'SEND'
        ? rendering(color.fBlack, color.bYellow, ' SEND ')
        : rendering(color.fBlack, color.bGreen, ' EDIT ');
    const targetLabel = rendering(color.bGreen, color.fBlack, ` ${target} `);
    logger.debug(`${kindLabel}${targetLabel} ${summary}`, kind === 'SEND' ? logLevel.info : logLevel.debug);
}

void bot.start().catch(e => logger.debug(` ${e.message ?? e}`, logLevel.fatal));


// Receive Messages
async function messageHandle(botMsg: Message): Promise<void> {
    try {
        const USERNAME: string = (await bot.api.getMe()).username;
        let Commands = await bot.api.getMyCommands();
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
            else if(msg.chat.id != msg.from.id)
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
                    if(msg.chat.id != msg.from.id)
                        await msg.chat.save(DB);
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
        if(msg.chat.id != msg.from.id)
            await msg.chat.save(DB);
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
    let supportCmds = (await bot.api.getMyCommands()).map(x => x.command.replace("/",""));
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
        case "mai":
            maiHandle(msg);
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
                `Proced CMD: ${msg.from.commandProcessed}\n`+
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
        let botSupprort = (await bot.api.getMyCommands()).map( x => x.command);

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
    bot.api.forwardMessage(id, src, msgid);
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
    maisegaId = msg.command?.content[0];
    msg.reply("OK");
}
function maiSetP(msg: message): void
{
    maiPasswd = msg.command?.content[0];
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
// Mai Account Handler
async function maiHandle(msg: message): Promise<void>
{
    let content = msg.command?.content;
    if(!content || !content[0]) {
        let result = "```Usage\n/mai bind <USERNAME> <PASSWD>\n/mai info\n/mai b50\n/mai b50 lite\n/mai flushcache\n\nExamples:\n/mai bind MBRjun 123456\n/mai info\n/mai b50\n/mai b50 lite\n/mai flushcache```";
        msg.reply(result);
        return;
    }
    switch(content[0]) {
        case "bind":
            await maiBind(msg, content);
        break;
        case "info":
            await maiInfo(msg);
        break;
        case "b50":
            if (content[1] === "lite") {
                await maiB50Lite(msg);
            } else {
                await maiB50(msg);
            }
        break;
        case "flushcache":
            await maiFlushCache(msg);
        break;
        default:
            msg.reply("```Usage\n/mai bind <USERNAME> <PASSWD>\n/mai info\n/mai b50\n/mai b50 lite\n/mai flushcache```");
        break;
    }
}
async function maiBind(msg: message, content: string[]): Promise<void>
{
    // Forbid anonymous accounts and group itself
    if(msg.senderChat != undefined) {
        msg.reply("Sending bind from group is not currently supported.");
        return;
    }
    if(!content[1] || !content[2]) {
        msg.reply("```Usage\n/mai bind <USERNAME> <PASSWD>```");
        return;
    }
    let segaId = content[1];
    let password = content[2];
    let acc = await maiAccount.search(DB, msg.from.id, regMaiServer.JP);
    if(acc == undefined) {
        acc = new maiAccount(msg.from.id, regMaiServer.JP);
    }
    acc.loginType = maiLoginType.sega;
    acc.maiId = segaId;
    acc.maiToken = password;
    acc.maiAlterId = undefined;
    acc.maiAlterToken = undefined;
    await acc.save(DB);
    msg.reply("Bind successfully.");
}
async function maiInfo(msg: message): Promise<void>
{
    let acc = await maiAccount.search(DB, msg.from.id, regMaiServer.JP);
    if(acc == undefined || !acc.maiId || !acc.maiToken) {
        msg.reply("Bind SEGA ID first.\n/mai bind <USERNAME> <PASSWD>");
        return;
    }
    try {
        let name = await maiInfoJp(acc.maiId, acc.maiToken);
        msg.reply("```\nUsername: " + name + "\n```");
    } catch(e: any) {
        msg.reply("Login failed: " + (e.message ?? e));
    }
}

interface b50Cache {
    version: 2;
    playerName: string;
    rating: string;
    scoreTables: difficultyScore[][];
}

async function readB50Cache(userId: bigint): Promise<b50Cache | undefined> {
    const cached = await DB.maiData.findUnique({ where: { id: userId } });
    if (!cached || cached.server !== 'JP') return undefined;
    try {
        const data = JSON.parse(cached.data) as b50Cache;
        if (data.version !== 2 || !Array.isArray(data.scoreTables) || data.scoreTables.length !== 5) return undefined;
        return data;
    } catch {
        return undefined;
    }
}

async function writeB50Cache(userId: bigint, cache: b50Cache): Promise<void> {
    await DB.maiData.upsert({
        where: { id: userId },
        create: {
            id: userId,
            server: 'JP',
            loginType: 'sega',
            data: JSON.stringify(cache),
        },
        update: {
            server: 'JP',
            loginType: 'sega',
            data: JSON.stringify(cache),
        },
    });
}

async function queryB50(
    userId: bigint,
    acc: maiAccount,
    onProgress?: (percent: number, detail: string, scoreCount?: number) => Promise<void>
): Promise<{ playerName: string; rating: string; entries: b50Entry[]; cached: boolean }> {
    if (!acc.maiId || !acc.maiToken) throw new Error('maimai DX Net 账号未绑定');
    const segaId = acc.maiId;
    const password = acc.maiToken;
    await onProgress?.(0, 'Fetching local cache...');
    const cached = await readB50Cache(userId);

    // Login once: get userId + name + current rating.
    await onProgress?.(2, 'Logining...');
    const home = await getPlayerHomeJp(segaId, password, onProgress);
    if (cached && cached.rating === home.rating) {
        const entries = buildBest50Entries(cached.scoreTables);
        await warmJacketCache(home.userId, entries, onProgress);
        await warmDxStarCache(entries, onProgress);
        await onProgress?.(100, 'Cache available. Reading cache...\nUse ``/mai flushcache`` to clear cache.', entries.length);
        return { playerName: cached.playerName, rating: home.rating, entries, cached: true };
    }

    await onProgress?.(5, cached ? 'Cache need revalidate. Refreshing...' : 'Ready to read records.');
    const scoreTables = await fetchB50ScoreTablesForUserJp(home.userId, onProgress);
    const entries = buildBest50Entries(scoreTables);
    await warmJacketCache(home.userId, entries, onProgress);
    await warmDxStarCache(entries, onProgress);
    await writeB50Cache(userId, { version: 2, playerName: home.name, rating: home.rating, scoreTables });
    await onProgress?.(100, 'Query finished.', entries.length);
    return { playerName: home.name, rating: home.rating, entries, cached: false };
}

async function maiFlushCache(msg: message): Promise<void> {
    const deleted = await DB.maiData.deleteMany({ where: { id: msg.from.id, server: 'JP' } });
    msg.reply(deleted.count ? 'Cache cleared.' : 'No cache available.');
}

async function maiB50(msg: message): Promise<void>
{
    let acc = await maiAccount.search(DB, msg.from.id, regMaiServer.JP);
    if(acc == undefined || !acc.maiId || !acc.maiToken) {
        msg.reply("Bind SEGA ID first.\n/mai bind <USERNAME> <PASSWD>");
        return;
    }

    // Step 1: Send placeholder image immediately
    let placeholderMsgId: number | undefined;
    try {
        let placeholderBuf = await generatePlaceholder();
        logOutbound('SEND', msg.chat.id.toString(), 'Querying B50... 0%', true, msg.from);
        let sent = await bot.api.sendPhoto(msg.chat.id.toString(), new InputFile(placeholderBuf, 'placeholder.png'), {
            caption: 'Querying B50... 0%',
            reply_to_message_id: msg.id,
        });
        placeholderMsgId = sent.message_id;
    } catch {
        // If placeholder fails, still proceed with data fetch
    }

    const updateProgress = async (percent: number, detail: string, scoreCount?: number) => {
        if (!placeholderMsgId) return;
        await bot.api.editMessageCaption(msg.chat.id.toString(), placeholderMsgId, {
            caption: `Querying B50... ${percent}%\n${detail}${scoreCount == undefined ? '' : `\nParsed ${scoreCount} valid records`}`,
        });
        logOutbound('EDIT', msg.chat.id.toString(), `Querying B50... ${percent}%\n${detail}`, false, msg.from);
    };

    // Step 2: Fetch data
    try {
        const result = await queryB50(msg.from.id, acc, updateProgress);
        let playerName = result.playerName;
        let rating = result.rating;
        let entries = result.entries;

        if (!entries || entries.length === 0) {
            throw new Error('NODATA: No valid B50 records found.');
        }

        let imageBuf = await generateB50Image(playerName, rating, entries);

        // Step 3: Update placeholder with real image, or send new
        if (placeholderMsgId) {
            logOutbound('EDIT', msg.chat.id.toString(), `${playerName} の B50 | DX Rating: ${rating}`, true, msg.from);
            await bot.api.editMessageMedia(msg.chat.id.toString(), placeholderMsgId, {
                type: 'photo',
                media: new InputFile(imageBuf, 'b50.png'),
                caption: `B50 | ${playerName} | ${rating}`,
            });
        } else {
            logOutbound('SEND', msg.chat.id.toString(), `B50 | ${playerName} | ${rating}`, true, msg.from);
            await bot.api.sendPhoto(msg.chat.id.toString(), new InputFile(imageBuf, 'b50.png'), {
                caption: `B50 | ${playerName} | ${rating}`,
                reply_to_message_id: msg.id,
            });
        }
    } catch(e: any) {
        let errMsg = "Unexpected error, please report to bot admin:" + (e.message ?? e);
        if (placeholderMsgId) {
            logOutbound('EDIT', msg.chat.id.toString(), errMsg, false, msg.from);
            await bot.api.editMessageCaption(msg.chat.id.toString(), placeholderMsgId, { caption: errMsg });
        } else {
            msg.reply(errMsg);
        }
    }
}

function b50LiteGrade(achievement: number): string {
    if (achievement >= 100.5) return "SSS+";
    if (achievement >= 100) return "SSS";
    if (achievement >= 99.5) return "SS+";
    if (achievement >= 99) return "SS";
    if (achievement >= 98) return "S+";
    if (achievement >= 97) return "S";
    if (achievement >= 94) return "AAA";
    if (achievement >= 90) return "AA";
    if (achievement >= 80) return "A";
    return "BBB";
}

function b50LiteCombo(type: number): string {
    return ["", "FC", "FC+", "AP", "AP+"][type] ?? "";
}

function b50LiteSync(type: number): string {
    return ["   ", "SP ", "FS ", "FS+", "FDX", "FX+"][type] ?? "   ";
}

function escapeCodeText(value: string): string {
    return value.replace(/`/g, "'");
}

function formatB50Lite(entries: b50Entry[]): string[] {
    const lines: string[] = [];
    for (const entry of entries) {
        const chartType = entry.isDxChart ? "DX" : "STD";
        const title = escapeCodeText(entry.songName);
        const level = entry.level.padStart(3);
        const combo = b50LiteCombo(entry.comboType);
        const sync = b50LiteSync(entry.syncType);
        const firstLine = `[${entry.rank.toString().padStart(2, "0")}] ${title} ${level} ${chartType}`;
        const gradeLine = `     ${b50LiteGrade(entry.achievement).padEnd(4)} ${entry.achievement.toFixed(4).padStart(8)}% ${entry.rating} ${sync}${combo ? ` ${combo}` : ""}`;
        lines.push(firstLine, gradeLine);
    }

    const chunks: string[] = [];
    let chunk = "";
    for (const line of lines) {
        const next = chunk ? `${chunk}\n${line}` : line;
        if (next.length > 3600 && chunk) {
            chunks.push(`\`\`\`\n${chunk}\n\`\`\``);
            chunk = line;
        } else {
            chunk = next;
        }
    }
    if (chunk) chunks.push(`\`\`\`\n${chunk}\n\`\`\``);
    return chunks;
}

async function maiB50Lite(msg: message): Promise<void>
{
    let acc = await maiAccount.search(DB, msg.from.id, regMaiServer.JP);
    if(acc == undefined || !acc.maiId || !acc.maiToken) {
        msg.reply("Bind SEGA ID first.\n/mai bind <USERNAME> <PASSWD>");
        return;
    }

    let progressMsg: message | undefined;
    try {
        const createdProgressMsg = await msg.reply("```\nQuerying B50... 0%```");
        if (!createdProgressMsg) throw new Error("无法创建查询进度消息");
        progressMsg = createdProgressMsg;
        const updateProgress = async (percent: number, detail: string, scoreCount?: number) => {
            const countLine = scoreCount == undefined ? "" : `\n${scoreCount} musicDetails parsed.`;
            await createdProgressMsg.edit(`\`\`\`\nQuerying B50... ${percent}%\n${detail}${countLine}\n\`\`\``);
        };

        const result = await queryB50(msg.from.id, acc, updateProgress);
        const entries = result.entries;
        if (entries.length === 0) throw new Error("NODATA: No valid B50 records found.");

        await createdProgressMsg.delete();
        for (const output of formatB50Lite(entries)) {
            await msg.reply(output);
        }
    } catch(e: any) {
        const errorText = `Unexpected error, please report to bot admin: ${e.message ?? e}`;
        if (progressMsg) {
            await progressMsg.edit(errorText, "Markdown");
        } else {
            msg.reply(errorText);
        }
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
    let err = '```Usage\n/karcCalc <lvl> <score>\n\nExamples:\n/karcCalc 11 950\n/karcCalc 9.7 9921930```';
    if(!input || !input[1]) {
        msg.reply(err)
    } else {
        try {
            msg.reply('```Result\n' + arcRtnCalc(parseFloat(input[0]), parseInt(input[1])) + '```');
        } catch {
            msg.reply(err);
        }
    }
}
