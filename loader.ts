import fs from 'fs';
import { spawn } from 'child_process';

function loader() {
    return spawn('pnpm', ['run', 'core']);
}

function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

function run() {
    const subprocess = loader();
    const confWatcher = fs.watch('config.yaml', function () {
        console.log('LOADER: Config changed.');
        restart();
    });
    const coreWatcher = fs.watch('main.ts', function () {
        console.log('LOADER: Core updated.');
        deferRestart();
    });
    subprocess.stdout.on('data', data => {
        process.stdout.write(data.toString());
    });
    function restart() {
        console.log('LOADER: Reloading...');
        confWatcher.close();
        coreWatcher.close();
        subprocess.kill();
        run();
    };
    async function deferRestart() {
        console.log('LOADER: Deferred reloading...');
        confWatcher.close();
        coreWatcher.close();
        await sleep(5000);
        console.log('LOADER: Reloading...');
        subprocess.kill();
        run();
    }
}

run();
