var nodeBot = require('node-telegram-bot-api');
const { execFileSync } = require('child_process');

var token = process.env.TELEGRAM_TOKEN;
var bot = new nodeBot(token, {polling: true});

function exec(path, args) {
    console.log('\x1b[45m EXEC \x1b[0m ' + path + ' ARGS: ' + args );
    let stdout = execFileSync(path, args).toString();
    return stdout;
}


bot.onText(/[\s\S]*/, function (msg, resp) {
var chatId = msg.chat.id;
    console.log('\x1b[44m RECV \x1b[42m ' + chatId + ' \x1b[0m ' + resp );
});

bot.onText(/\/status/, function (msg) {
    var chatId = msg.chat.id;
    var resp = '*Kalium Bot*\n`' + exec('bash', ['neofetch', '--stdout']) + '`';
    console.log('\x1b[43m SEND \x1b[42m ' + chatId + ' \x1b[0m ' + resp );
    bot.sendMessage(chatId, resp,{ parse_mode: 'Markdown' });
});

bot.onText(/\/wol/, function (msg) {
    var chatId = msg.chat.id;
    const stdout = execFileSync('wakeonlan', ['08:bf:b8:43:30:15']);
    var resp = '`' + stdout.toString() + '`';
    console.log('\x1b[45m EXEC \x1b[0m wakeonlan 08:bf:b8:43:30:15');
    console.log('\x1b[43m SEND \x1b[42m ' + chatId + ' \x1b[0m ' + resp );
    bot.sendMessage(chatId, resp,{ parse_mode: 'Markdown' });
});
