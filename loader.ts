import fs from 'fs';
import { spawn } from 'child_process';
import * as color from './lib/color';

console.log(color.loader + 'Preparing core...');

function loader() {
    return spawn('pnpm', ['run', 'core']);
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
        restart();
    });

    subprocess.stdout.on('data', data => {
        process.stdout.write(data.toString());
    });

    // 监听子进程的 exit 事件
    subprocess.on('exit', () => {
        console.log(color.loader + 'Subprocess exited.');
        run();
    });

    function restart() {
        console.log(color.loader + 'Reloading...');
        confWatcher.close();
        coreWatcher.close();
        // 不再直接杀死子进程，而是等待其自行退出
        subprocess.kill('SIGHUP');
        // run();
    };
    /*async function deferRestart() { // idk why async not work
        console.log(color.loader + 'Deferred reloading...');
        confWatcher.close();
        coreWatcher.close();
        await sleep(5000);
        restart();
    };*/
}

run();
