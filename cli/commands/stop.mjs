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

	let pids = await this.pids();
	if (pids.length) {
		console.status('shutting down...', 'red');
		pids.map(i => {
			try { process.kill(i, 'SIGTERM'); } catch (e) {}
		});
		await new Promise(resolve => setTimeout(resolve, 250));
		pids = await this.pids();
		pids.map(i => {
			try { process.kill(i, 'SIGKILL'); } catch (e) {}
		});
		console.status('off', 'grey');
		return true;
	} else if (!await this.file(this.domain().path)) {
		await this.prompt('install');
	} else {
		console.status('off', 'grey');
	}

};
