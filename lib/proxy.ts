// System proxy detection
import { execFileSync } from 'child_process';
import * as os from 'os';

export function getSystemProxy(): string | undefined {
    // 1. Check environment variables first (cross-platform)
    const envVars = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy'];
    for (const v of envVars) {
        const val = process.env[v];
        if (val) return normalizeProxy(val);
    }

    // 2. Windows: check registry (Internet Settings)
    if (os.platform() !== 'win32') return undefined;

    try {
        const regExe = (process.env.SystemRoot || process.env.WINDIR || 'C:\\WINDOWS') + '\\System32\\reg.exe';
        const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

        const enableOut = execFileSync(regExe, ['query', regKey, '/v', 'ProxyEnable'], { encoding: 'utf8', timeout: 5000 });
        const enableMatch = enableOut.match(/ProxyEnable\s+REG_DWORD\s+0x(\d+)/i);
        if (!enableMatch || parseInt(enableMatch[1], 16) !== 1) return undefined;

        const serverOut = execFileSync(regExe, ['query', regKey, '/v', 'ProxyServer'], { encoding: 'utf8', timeout: 5000 });
        const serverMatch = serverOut.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
        if (serverMatch) {
            const proxy = serverMatch[1].trim();
            const httpsMatch = proxy.match(/https=([^;]+)/i);
            return normalizeProxy(httpsMatch ? httpsMatch[1] : proxy);
        }
    } catch { /* registry not available */ }

    return undefined;
}

function normalizeProxy(raw: string): string {
    if (!/^https?:\/\//i.test(raw)) {
        return 'http://' + raw;
    }
    return raw;
}
