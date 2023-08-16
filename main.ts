import nodeBot from 'node-telegram-bot-api';
import { execFileSync } from 'child_process';
const ver = process.env.npm_package_version;

let token = process.env.TELEGRAM_TOKEN;
let bot = new nodeBot(token as string, {polling: true});
console.log('Kalium ' + ver + ' started.');

// Receive Messages
bot.onText(/[\s\S]*/, function (msg, resp) {
    let chatId = msg.chat.id;
    console.log('\x1b[44m RECV \x1b[42m ' + chatId + ' \x1b[0m ' + resp );
});

// Kalium Bot Functions
function exec(path: string, args: string[]) {
    console.log('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    let stdout = execFileSync(path, args).toString();
    return stdout;
}
function send(id: any, msg: string){
    console.log('\x1b[43m SEND \x1b[42m ' + id + ' \x1b[0m ' + msg );
    bot.sendMessage(id, msg, { parse_mode: 'Markdown' });
}

// Bot Commands
bot.onText(/\/status/, function (msg) {
    let resp = '*Kalium Bot*\n' +
                'Version: ' + ver + '\n' +
                '`' + exec('bash', ['neofetch', '--stdout']) + '`';
    send(msg.chat.id, resp);
});
bot.onText(/\/wol/, function (msg) {
    let resp = '`' + exec('wakeonlan', ['08:bf:b8:43:30:15']) + '`';
    send(msg.chat.id, resp);
});
