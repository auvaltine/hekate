/**
 * Stops a server.
 *
 * 1. Server is running, shut down.
 * 2. Server is not installed, prompt installation.
 * 3. Server is off, print off.
 *
 * @return {Boolean|undefined} Returns true if a server process ID exists.
 */
export default async function stop () {

    let i;
    if ((i = await this.pid())) {
        console.status('shutting down...', 'red');
        process.kill(i, 'SIGKILL');
        console.status('off', 'grey');
        return true;
    } else if (!await this.file(this.domain().path)) {
        await this.prompt('install');
    } else {
        console.status('off', 'grey');
    }

};