var nodeBot = require('node-telegram-bot-api');
const { execFileSync } = require('child_process');

var token = process.env.TELEGRAM_TOKEN;

var bot = new nodeBot(token, {polling: true});

bot.onText(/[\s\S]*/, function (msg, resp) {
var chatId = msg.chat.id;
    console.log('\x1b[44m RECV \x1b[42m ' + chatId + ' \x1b[0m ' + resp );
});

bot.onText(/\/status/, function (msg) {
    var chatId = msg.chat.id;
    const stdout = execFileSync('neofetch', ['--stdout']);
    var resp = '*Kalium Bot*\n`' + stdout.toString() + '`';
    console.log('\x1b[45m EXEC \x1b[0m neofetch --stdout');
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
