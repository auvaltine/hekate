import regexp from '../constants/regexp.mjs';
import sh from '../helpers/shell.mjs';

/**
 * Starts a server.
 *
 * @return {undefined}
 */
export default async function start () {

	const host = this.domain();
	if ((await this.pids()).length) {
		console.status('ready', 32);
	} else if (!await this.file(host.path)) {
		await this.prompt('install');
	} else {
		  let pids = [];
		const tail = sh.spawn('tail', [ '-n1', '-f', './logs/stdout.log' ], { cwd: host.path });
		console.status('starting...', 33);
		tail.stdout.on('data', i => {
			if (pids.find(pid => new RegExp(regexp.ready + pid + '\\)$', 'm').test(i.toString()))) {
				tail.kill();
				console.status('ready', 32);
			}
		});
		sh.exec(`node '${host.path}' > /dev/null 2>&1 &`, async () => pids = await this.pids());
	}

};
