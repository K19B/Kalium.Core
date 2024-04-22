const { execFileSync } = require('child_process');
const bashPreBuild = ['build/prebuild.sh']
const cmdPreBuild = ['/c', 'build\\prebuild.bat']
let buildShell;
let buildPreArg;

if (process.env.SHELL && process.env.SHELL.includes('bash')) {
    buildShell = process.env.SHELL;
    buildPreArg = bashPreBuild;
} else if (process.platform == 'win32') {
    buildShell = 'cmd.exe';
    buildPreArg = cmdPreBuild;
} else if (process.platform == 'linux') {
    buildShell = 'bash';
    buildPreArg = bashPreBuild;
} else {
    throw new Error("EK0002: Shell detect failed.");
}

try {
    let stdout = execFileSync(buildShell, buildPreArg).toString();
    console.log(stdout);
} catch (e) {
    throw new Error("EK0007: Pre build failed.");
}

let db = require('../dist/prisma.cjs');
db.copyPrisma();
