import * as os from 'os';
import { execFileSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Bot } from 'grammy';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { logger, logLevel } from './lib/class';
import { registerCliCommandHandler, registerCommandHandler } from './lib/command';
import { dbUrl } from './lib/prisma';
import { getSystemProxy } from './lib/proxy';
import { BOTCONFIG, LOGNAME } from './lib/runtime';

export { BOTCONFIG, LOGNAME };

const VER = process.env.npm_package_version;
const PLATFORM = os.platform();
const KERNEL = PLATFORM === 'linux' ? execFileSync('uname', ['-sr']).toString() : 'NotSupport';

logger.debug(' Kalium ' + VER);
logger.debug('');
if (BOTCONFIG == null) {
    logger.debug(' Read config failure', logLevel.error);
    process.exit(1);
}
if (BOTCONFIG.login.tokenT == null) {
    logger.debug(' Telegram bot token not found', logLevel.error);
    process.exit(1);
}
logger.debug(` Config version: v${BOTCONFIG.core.confVer}`);
logger.debug(' All checks passed.');

const DB = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl(),
        },
    },
});

const proxyUrl = getSystemProxy();
const botConfig: any = {};
if (proxyUrl) {
    logger.debug(` Using system proxy: ${proxyUrl}`);
    botConfig.client = { baseFetchConfig: { agent: new HttpsProxyAgent(proxyUrl) } };
}

const bot = new Bot(BOTCONFIG.login.tokenT, botConfig);

registerCliCommandHandler(bot);
registerCommandHandler({ bot, db: DB, version: VER, kernel: KERNEL });
bot.catch(err => logger.debug(` ${err.error ?? err.message}`, logLevel.fatal));

logger.debug(' Bot core started.\n');
void bot.start().catch(error => logger.debug(` ${error.message ?? error}`, logLevel.fatal));
