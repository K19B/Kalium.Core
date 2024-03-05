#!/bin/bash
curl 'https://maimaidx.jp/maimai-mobile/ranking/musicRankingDetail/?idx=9060819c8a4ce0de92745e2ff3b0c43f5fde02cef62f0f585447836501c8045e6743a13ba46beea709342bb0ce2723c274ea0aef14eacd229d261a702c2c9857IlHvRWdcvbxTiz8O71%2BmSXRxU%2FNrgenNiorFBvontd0%3D&scoreType=2&rankingType=99&diff=4'   -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'   -H 'Accept-Language: zh-CN,zh-TW;q=0.9,zh;q=0.8'   -H 'Cache-Control: max-age=0'   -H 'Connection: keep-alive'   -H "Cookie: _t=$0; userId=$1"   -H 'DNT: 1'   -H 'Referer: https://maimaidx.jp/maimai-mobile/ranking/search/?genre=105&scoreType=2&rankingType=99&diff=4'   -H 'Sec-Fetch-Dest: document'   -H 'Sec-Fetch-Mode: navigate'   -H 'Sec-Fetch-Site: same-origin'   -H 'Sec-Fetch-User: ?1'   -H 'Upgrade-Insecure-Requests: 1'   -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'   -H 'sec-ch-ua: "Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"'   -H 'sec-ch-ua-mobile: ?0'   -H 'sec-ch-ua-platform: "Windows"' -kfsS > /tmp/maidxt1.tmp
echo -e "[1] \c"
cat /tmp/maidxt1.tmp | sed -n '226,226p' | sed 's/^[ \t]*//g'
cat /tmp/maidxt1.tmp | sed -n '228,228p' | sed -n 's/.*f_r t_c">\([^<]*\)<\/div>.*/\1/p'
cat /tmp/maidxt1.tmp | sed -n '229,229p' | sed -n 's/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">\([^<]*\)<\/div>.*/\1/p'
echo -e "[2] \c"
cat /tmp/maidxt1.tmp | sed -n '239,239p' | sed 's/^[ \t]*//g'
cat /tmp/maidxt1.tmp | sed -n '241,241p' | sed -n 's/.*f_r t_c">\([^<]*\)<\/div>.*/\1/p'
cat /tmp/maidxt1.tmp | sed -n '242,242p' | sed -n 's/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">\([^<]*\)<\/div>.*/\1/p'
echo -e "[3] \c"
cat /tmp/maidxt1.tmp | sed -n '252,252p' | sed 's/^[ \t]*//g'
cat /tmp/maidxt1.tmp | sed -n '254,254p' | sed -n 's/.*f_r t_c">\([^<]*\)<\/div>.*/\1/p'
cat /tmp/maidxt1.tmp | sed -n '255,255p' | sed -n 's/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">\([^<]*\)<\/div>.*/\1/p'
