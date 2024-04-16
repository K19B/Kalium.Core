import nodeBot from 'node-telegram-bot-api';
import { execFileSync } from 'child_process';
import fs from 'fs';
import yaml from 'yaml';
import { maiRankJp } from './plugin/kalium-vanilla-mai/main';
import * as color from './lib/color';
import * as arc from './plugin/kalium-vanilla-arc/main';
import * as os from 'os';

process.stdin.on('data', (data: Buffer) => {
    let key = data.toString().trim();
    if (key === 'KINTERNALLOADERQUIT') {
        console.log(color.core + 'Core exiting... (Rcvd \'KINTERNALLOADERQUIT\' command)');
        process.exit();
    }
});

const ver = process.env.npm_package_version;
const confVer = 1;
const platform = os.platform();

let kernel = "NotSupport";
if (platform === 'linux') 
    kernel = execFileSync('uname', ['-sr']).toString();
let config: any;
let TOKEN: string | undefined;
//let TOKEN = process.env.TELEGRAM_TOKEN;
let LOGNAME = 'main.log';

console.log(color.core + 'Kalium ' + ver + '\n'
            + color.core);

try {
    config = yaml.parse(fs.readFileSync('config.yaml', 'utf8'));
    console.log(color.core + 'Config exist, checking config...');
} catch (e) {
    console.log(color.core + 'Could not read config, trying creating...');
}

if (config.core.version) {
if (config.core.version <= confVer) {
if (config.core.version == confVer) {
    console.log(color.core + 'Loading config...');
    TOKEN = config.env.bottoken || process.env.TELEGRAM_TOKEN;
    LOGNAME = config.env.logfile || 'main.log';
} else {
    // There is nothing now.
    console.log(color.core + 'Config upgraded, please re-run bot.');
    process.exit();
}
} else {
    console.log('WARNING: Partial downgrade detected(config version mismatch), bot may not work properly.');
}
} else {
    throw new Error('EKCNFIV: Config is not valid.');
}

console.log(color.core + 'Running pre-checks...');

if (!TOKEN) {
    throw new Error('EKPREF: Pre-checking failed.');
}
console.log(color.core + 'All checks passed.');

let bot = new nodeBot(TOKEN as string, {polling: true});
console.log(color.core + 'Bot core started.\n');

fs.writeFile(LOGNAME, 'Kalium ' + ver + ' started on ' + Date() + '\n', { flag: 'a+' }, err => {});

// Receive Messages
bot.onText(/[\s\S]*/, function (msg, resp) {
    let chatId = msg.chat.id;
    let userId = msg.from?.id;
    function from() {
    if (chatId == userId) {
        return 'P:' + chatId;
    } else {
        return 'U:' + userId + ' C:' + chatId;
    } }
    log('RECV', 'INFO  ', from() + ' | ' + resp);
    console.log('\x1b[44m RECV \x1b[42m ' + from() + ' \x1b[0m ' + resp );
});

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
    console.log('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', e as string);
    }
}
function secureExec(path: string, args: string[]) {
    console.log('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch (e) {
        return err('EXEC', 'Is the token valid?');
    }
}
function send(id: any, msg: string) {
    console.log('\x1b[43m SEND \x1b[42m ' + id + ' \x1b[0m ' + msg );
    log('SEND', 'INFO  ', id + ' | ' + msg);
    bot.sendMessage(id, msg, { parse_mode: 'Markdown' });
}
async function reply(id: any, msg: string, mid: number) {
    console.log('\x1b[43m RPLY \x1b[42m ' + id + ' \x1b[0m ' + msg );
    log('RPLY', 'INFO  ', id + ' | ' + msg);
    let { message_id } = await bot.sendMessage(id, msg, { parse_mode: 'Markdown', reply_to_message_id: mid });
    return message_id;
}
function fwrd(id: any, src: any, msgid: number) {
    console.log('\x1b[43m FWRD \x1b[42m ' + id + ' \x1b[0m ' + src + "/" + msgid);
    log('FWRD', 'INFO  ', id + ' | ' + src + "/" + msgid);
    bot.forwardMessage(id, src, msgid, );
}
function err(from: string, stderr: string) {
    log(from, 'ERROR ', from + ' called error function.')
    return '[ stderr detected ]' + '\n' +
           stderr + '\n' +
           '---' + '\n' +
           'Kalium ' + ver + ', Kernel ' + kernel;
}

// Bot Commands
bot.onText(/^\/userinfo/, function (msg) {
    let chatId = msg.chat.id;
    let userId = msg.from?.id;
    if (chatId == userId) {
        let resp = 'Kalium User Info\n```\nID: ' + userId +
                   '\nLANG: ' + msg.from?.language_code + '\n```' + Date();
        send(msg.chat.id, resp);
    } else {
        send(msg.chat.id, 'Private Message Only');
    }
}); 
bot.onText(/^\/kping/, function (msg) {
    let resp = 'Kalium is alive.\nServer time: ' + Date();
    send(msg.chat.id, resp);
}); 
bot.onText(/^\/status/, function (msg) {
    let resp = 'Kalium Bot v' + ver + ' Status\n' +
                '```\n' + exec('bash', ['neofetch', '--stdout']) + '```\n'
                + Date();
    send(msg.chat.id, resp);
}); 
bot.onText(/^\/wol/, function (msg) {
    if (msg.from?.id == 1613650110) {
        let resp = '`' + exec('wakeonlan', ['08:bf:b8:43:30:15']) + '`';
        send(msg.chat.id, resp);
    } else {
        send(msg.chat.id, 'Invalid');
    }
});
/* bot.onText(/\/(?:\$([a-zA-Z0-9]\S*)|\$?([^a-zA-Z0-9\s]\S*))\s*(.*)/, function (msg, resp) {
    //let data = resp! + '';
    function reply() {
    if (msg.reply_to_message?.from?.id == msg.from?.id || msg.reply_to_message?.from?.id == undefined) {
        let reply = ' 自己';
        return reply;
    } else {
        let reply = ' ' + msg.reply_to_message?.from?.first_name;
        return reply;
    } }
    function data() {
    if (resp![3] == "") {
        let data = msg.chat.first_name! + ' '+ resp![2] + '了' + reply() + ' ！';
        return data;
    } else {
        let data = msg.chat.first_name! + ' '+ resp![2] + reply() + resp![3] + ' ！';
        return data;
    } }
    send(msg.chat.id, data());
}); */
bot.onText(/来玉林北流/, function (msg) { // Misaka Logger
    fwrd(msg.chat.id, "@MBRFans", 374741);
});
bot.onText(/^\/check/gusi, function (msg) {
    var checkFqdn = 'FQDN not detected\n';
    var checkUrl = 'URL not detected';
    // Part I: Check FQDN
    let fqdn = msg.text!.match(/(((?!-))(xn--|_)?[a-z0-9-]{0,61}[a-z0-9]{1,1}\.)+(xn--)?([a-z0-9][a-z0-9\-]{0,60}|[a-z0-9-]{1,30}\.[a-z]{2,})/);
    if (fqdn == null) {
        var checkFqdn = 'FQDN not detected\n';
    } else {
        let fqdnLookup = exec('nslookup', [fqdn[0], 'mbr.moe']);
        var checkFqdn = 'FQDN Detected\n```nslookup\n' + fqdnLookup + '\n```\n';
    }
    // Part II: Check URL
    let url = msg.text!.match(/(?<protocol>https?):\/\/(?<domain>(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?)|(\[(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\])))(:(?<port>([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])))?(?<path>\/[a-zA-Z0-9\-\._~:\/\?#\[\]@!\$&'\(\)\*\+,;=]*)?/gusi);
    if (url == null) {
        var checkUrl = 'URL not detected';
        //send(msg.chat.id, 'Invalid');
    } else {
        let curlHeader = exec('curl', ['-IsSL', url[0]]);
        var checkUrl = 'URL Detected\n```curl\n' + curlHeader + '\n```\n';
        //send(msg.chat.id, resp);
    }
    // Finish Check
    reply(msg.chat.id, checkFqdn + checkUrl, msg.message_id);
});
let maisegaId: undefined | string;
let maiPasswd: undefined | string;
let 白丝Id = '3129e55c7db031e473ce3256b8f6806a8513d536386d30ba2fa0c28214c8d7e4b3385051dee90d5a716c6e4215600be0be3169f7d3ecfb357b3e2b6cb8c73b68H6MMqPZtVOOjD%2FxkMZMLmnqd6sH9jVYK1VPcCJTKnsU%3D';
bot.onText(/^\/setid/, function (msg) {
    maisegaId = msg.text?.split(' ')[1]
    reply(msg.chat.id, "OK", msg.message_id);
});
bot.onText(/^\/setp/, function (msg) {
    maiPasswd = msg.text?.split(' ')[1]
    reply(msg.chat.id, "OK", msg.message_id);
});
bot.onText(/白丝排行榜/, async function (msg) {
    if(!maisegaId || !maiPasswd) {
        let result = "你还没有设置 DX Net 登录凭据哇！\n使用 /setid 和 /setp 登录！"
        reply(msg.chat.id, result, msg.message_id);
    } else {
        let result = maiRankJp(白丝Id, maisegaId, maiPasswd);
        reply(msg.chat.id, '```\n' + await result + '```', msg.message_id);
    }
});
bot.onText(/^\/kupdate/, function (msg) {
    if (msg.from?.id == 1613650110) {
        let resp = '```Result\n' + exec('git', ['pull']) + '```';
        reply(msg.chat.id, resp, msg.message_id)
    } else {
        reply(msg.chat.id, 'Premission denied.', msg.message_id);
    }
});
bot.onText(/^\/karc calc/, function (msg) {
    let input = msg.text?.split(' ');
    let err = '```Usage\n/karc calc <lvl> <score>\n\nExamples:\n/karc calc 11 950\n/karc calc 9.7 9921930```';
    if(!input || !input[3]) {
        reply(msg.chat.id, err, msg.message_id);
    } else {
        try {
            reply(msg.chat.id, '```Result\n' + arc.arcRtnCalc(parseFloat(input[2]), parseInt(input[3])) + '```', msg.message_id)
        } catch {
            reply(msg.chat.id, err, msg.message_id);
        }
    }
});
