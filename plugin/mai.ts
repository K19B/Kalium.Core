import axios from "axios";
import https from "https";

// Disable maimaidx.jp Cert Check
const agent = new https.Agent({  
    rejectUnauthorized: false
});

// Endpoints
const
    dxNetJpUrl = 'https://maimaidx.jp',
    dxNetJpUrlLogin = 'https://maimaidx.jp/maimai-mobile/',
    dxNetJpAime = 'https://maimaidx.jp/maimai-mobile/aimeList/';

// Global headers
const
    // Endpoint Headers
    headerOriginJp = dxNetJpUrl,
    headerRefererJp = dxNetJpUrlLogin,
    headerAimeJp = dxNetJpAime,
    // Browser Headers
    headerAcceptPost = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    headerAcceptLanguage = 'zh-CN,zh-TW;q=0.9,zh;q=0.8',
    headerCacheControl = 'max-age=0',
    headerConnection = 'keep-alive',
    headerContentTypeForm = 'application/x-www-form-urlencoded',
    headerDNT = '1',
    headerUpgradeInsecureRequests = '1',
    // Chromium "Sec-Fetch" & "sec-ch-ua" Headers
    headerSFDest = 'document', 
    headerSFMode = 'navigate',
    headerSFSite = 'same-origin',
    headerSFSiteNone = 'none',
    headerSFUser = '?1',
    headerSCU = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    headerSCUMobile = '?0',
    headerSCUPlatform = '"Windows"',
    // UA
    headerUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

function buildToken() { // Cookie '_t'
    let os = require('os');
    let { createHash } = require('crypto');
    let date = new Date();
    let machineId = createHash('md5')
                    .update(os.hostname() + os.totalmem() + os.homedir() + date.getUTCFullYear() + 'Kalium')
                    .digest('hex');
    return machineId;
}

async function refreshIdJp(segaId: string, passwd: string) {
    let token = buildToken();
    let aimeId = '0';
    // Step 1-1: Login DX Net
    let loginNet = await axios({
        method: 'post',
        url: 'https://maimaidx.jp/maimai-mobile/submit/',
        data: {
            segaId: segaId,
            password: passwd,
            token: token
        },
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Cache-Control': headerCacheControl,
            'Connection': headerConnection,
            'Content-Type': headerContentTypeForm,
            'Cookie': '_t=' + token,
            'DNT': headerDNT,
            'Origin': headerOriginJp,
            'Referer': headerRefererJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSite,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status == 302;
        }
    }).then(response => {
        // response.data is for debug only, do NOT remove, will be dropped in 1-2
        return response.data + 'Response Headers:' + response.headers;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    // Step 1-2: Update userId After Login
    let IdAfterLogin = loginNet.match(/userId=([^;]+)/)![1];
    // Step 2-1: Sleep
    await sleep(100);
    // Step 2-2: Select AIME
    let selectAime = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/aimeList/submit/?idx=' + aimeId,
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + token + '; userId=' + IdAfterLogin,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status == 302;
        }
    }).then(response => {
        return 'Response Headers:' + response.headers + 'Code:' + response.status;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    // Step 2-3: Finish GetId
    let IdFin = selectAime.match(/userId=(\d+)/)![1];
    return IdFin;
}

export async function maiRankJp(sid: string, segaId: string, passwd: string) {
    // ReM only now
    let userId = await refreshIdJp(segaId, passwd);
    let rankPage = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/ranking/musicRankingDetail/?idx=' + sid + '&scoreType=2&rankingType=99&diff=4',
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => {
        return response.data;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    let rank1n = rankPage.split('\n')[225].trim();
    let rank1d = rankPage.split('\n')[227].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    let rank1l = rankPage.split('\n')[228].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    let rank2n = rankPage.split('\n')[238].trim();
    let rank2d = rankPage.split('\n')[240].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    let rank2l = rankPage.split('\n')[241].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    let rank3n = rankPage.split('\n')[251].trim();
    let rank3d = rankPage.split('\n')[253].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    let rank3l = rankPage.split('\n')[254].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    let result =
        '[1] ' + rank1n + '\n' +
        rank1d + '\n' +
        rank1l + '\n' +
        '[2] ' + rank2n + '\n' +
        rank2d + '\n' +
        rank2l + '\n' +
        '[3] ' + rank3n + '\n' +
        rank3d + '\n' +
        rank3l + '\n' ;
    return result;
}
