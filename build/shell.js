"use strict";
import { execFileSync } from 'child_process';

const bashBuild = ['build/build.sh']
const cmdBuild = ['/c', 'build\\build.bat']
let buildShell;
let buildArg;

if (process.env.SHELL && process.env.SHELL.includes('bash')) {
    buildShell = process.env.SHELL;
    buildArg = bashBuild;
} else if (process.platform == 'win32') {
    buildShell = 'cmd.exe';
    buildArg = cmdBuild;
} else if (process.platform == 'linux') {
    buildShell = 'bash';
    buildArg = bashBuild;
} else {
    throw new Error("EK0002: Shell detect failed.");
}

console.log(execFileSync(buildShell, buildArg).toString());
