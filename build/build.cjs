const { execFileSync } = require('child_process');
const fs = require('fs');

const bashPreBuild = ['build/build.sh']
const bashPostBuild = ['build/fini.sh']
const cmdPreBuild = ['/c', 'build\\build.bat']
const cmdPostBuild = ['/c', 'build\\finish.bat']
let buildShell;
let buildPreArg;
let buildPostArg;

if (process.env.SHELL && process.env.SHELL.includes('bash')) {
    buildShell = process.env.SHELL;
    buildPreArg = bashPreBuild;
    buildPostArg = bashPostBuild;
} else if (process.platform == 'win32') {
    buildShell = 'cmd.exe';
    buildPreArg = cmdPreBuild;
    buildPostArg = cmdPostBuild;
} else if (process.platform == 'linux') {
    buildShell = 'bash';
    buildPreArg = bashPreBuild;
    buildPostArg = bashPostBuild;
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

fs.writeFileSync('./.env', 'KALIUM_PRISMA_DATABASE_URL=' + db.dbUrl(), (e) => {
    if (e) {
        throw new Error("EK0009: Env write failed.");
    }
});

try {
    let stdout = execFileSync(buildShell, buildPostArg).toString();
    console.log(stdout);
} catch (e) {
    throw new Error("EK0008: Post build failed.");
}
