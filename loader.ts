import fs from 'fs';
import { spawn } from 'child_process';
import * as color from './lib/color';

console.log(color.loader + 'Preparing core...');

function loader() {
    return spawn('node', ['./dist/main']);
}

function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

function run() {
    const subprocess = loader();

    const confWatcher = fs.watch('config.yaml', function () {
        console.log(color.loader + 'Config changed.');
        restart();
    });
    const coreWatcher = fs.watch('main.ts', function () {
        console.log(color.loader + 'Core updated.');
        deferRestart();
    });

    subprocess.stdout.on('data', data => {
        process.stdout.write(data.toString());
    });

    subprocess.stderr.on('data', data => {
        process.stderr.write(color.fRed + data.toString());
    });

    subprocess.on('exit', () => {
        console.log(color.loader + 'Subprocess exited.');
        run();
    });

    function restart() {
        console.log(color.loader + 'Reloading...');
        confWatcher.close();
        coreWatcher.close();
        subprocess.stdin.write('KINTERNALLOADERQUIT\n');
        // do not use CTRLC/SIGTERM/SIGKILL to kill process
        // otherwise subprocess will never exit on reload
        // until there is a core error or loader restart
    };
    async function deferRestart() {
        console.log(color.loader + 'Deferred reloading...');
        confWatcher.close();
        coreWatcher.close();
        await sleep(3000);
        restart();
    };
}

run();
