import nodeBot from 'node-telegram-bot-api';
import { execFileSync } from 'child_process';
import fs from 'fs';
const ver = process.env.npm_package_version;
const kernel = execFileSync('uname', ['-sr']).toString();

let TOKEN = process.env.TELEGRAM_TOKEN;
let LOGNAME = 'main.log';

let bot = new nodeBot(TOKEN as string, {polling: true});
console.log('Kalium ' + ver + ' started.');

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
function log(type: string, lvl: string, data: string) {
    let logdata = serverTime() + ' ' + type + ' ' + lvl + ' ' + data + '\n';
    fs.writeFile(LOGNAME, logdata, { flag: 'a+' }, err => {});
}
function exec(path: string, args: string[]) {
    console.log('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    log('EXEC', 'INFO  ', path + ' ARGS: ' + args )
    try {
        let stdout = execFileSync(path, args).toString();
        return stdout;
    } catch {
        return err('EXEC');
    }
}
function send(id: any, msg: string) {
    console.log('\x1b[43m SEND \x1b[42m ' + id + ' \x1b[0m ' + msg );
    log('SEND', 'INFO  ', id + ' | ' + msg)
    bot.sendMessage(id, msg, { parse_mode: 'Markdown' });
}
function err(from: string) {
    log(from, 'ERROR ', from + ' called error function.')
    return '[ command error! ]' + '\n' +
           '[?] command not found' + '\n' +
           '[?] no stdout available' + '\n' +
           '---' + '\n' +
           'Kalium ' + ver + ', Kernel ' + kernel
}

// Bot Commands
bot.onText(/\/userinfo/, function (msg) {
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
bot.onText(/\/kping/, function (msg) {
    let resp = 'Kalium is alive.\nServer time: ' + Date();
    send(msg.chat.id, resp);
}); 
bot.onText(/\/status/, function (msg) {
    let resp = 'Kalium Bot v' + ver + ' Status\n' +
                '```bash\n' + exec('bash', ['neofetch', '--stdout']) + '```\n'
                + Date();
    send(msg.chat.id, resp);
}); 
bot.onText(/\/wol/, function (msg) {
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
