import axios from "axios";

// Endpoints
const
    dxNetJpUrl = 'https://maimaidx.jp',
    dxNetJpUrlLogin = 'https://maimaidx.jp/maimai-mobile/';

// Global headers
const
    // Endpoint Headers
    headerOriginJp = dxNetJpUrl,
    headerRefererJp = dxNetJpUrlLogin,
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
    headerSFUser = '?1',
    headerSCU = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    headerSCUMobile = '?0',
    headerSCUPlatform = '"Windows"',
    // UA
    headerUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function buildToken() { // Cookie '_t'
    let os = require('os');
    let { createHash } = require('crypto');
    let date = new Date();
    let machineId = createHash('md5')
                    .update(os.hostname() + os.totalmem() + os.homedir() + date.getUTCFullYear() + 'Kalium')
                    .digest('hex');
    return machineId;
}

function refreshIdJp(segaId: string, passwd: string) {
    let token = buildToken();
    let loginNet = axios({
        method: 'post',
        url: 'https://maimaidx.jp/maimai-mobile/submit/',
        params:{
            
        },
        data: {
            segaId: segaId,
            password: passwd,
            token: token
        },
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Cache-Control': headerCacheControl
        }
    })
}

export function maiRankJp(sid: string) {
    return buildToken();
}
