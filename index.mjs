#! /usr/bin/env -S node --experimental-modules

import child_process from 'node:child_process';
import fs			 from 'node:fs/promises';
import readline		 from 'node:readline';
import util			 from 'node:util';
import semver		 from 'semver';

const sh = {
	cwd: {},
	exec: util.promisify(child_process.exec),
	spawn: child_process.spawn
};

console.status = (text, color) => console.log(
	console.font('>', `-c ${color}`),
	console.font(':', 90),
	console.font(text, `-c ${color}`)
);
console.version = (prefix, local, remote) => [
	prefix,
	local ? console.font(local[0], local[1]) : '',
	remote ? console.font('⟶', 90) : '',
	remote ? console.font(remote[0], remote[1]) : ''
].join(' ');

class Server {

	static RegExp = {
		domain: /^(?:[a-z\d\-ßàÁâãóôþüúðæåïçèõöÿýòäœêëìíøùîûñé]+\.)*[a-z\d]+(?::\d+)?$/i, // valid domain
		ipv4: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/, // ipv4 check
		pathname: /\/apps\/.+\/content\/modules\/((?:client|server)\/([^\/]+))\/\2\.js$/, // module name from path
		prompt: /^(y(?:es)?|n(?:o)?)$/i, // prompt stdin
		ready: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z Ready \\(PID:', // ready notice
		version: /v((\d(?:\.\d+){0,2})(?:-(alpha|beta|nightly)(?:\+\d+)?)?)(?:\s|\*|$)/, // version
		fversion: /^\/\*! (@(?:client|server)\/(?:[a-z0-9\.]+)) v(\d+(?:\.\d+){0,2}(?:-(?:alpha|beta|nightly)(?:\+\d+)?)?) /, // version from file
		fdependencies: /^\/\*! dependencies: ([@\/a-z0-9\.,]+)/ // dependencies from file
	};

	run = {

		/**
		 * Installs a domain to the ./apps directory.
		 * Installs modules to a domain.
		 *
		 * 	- ./apps/[app-name]/assets/<html|js|scss>/
		 * 	- ./apps/[app-name]/content/<l10n|pages|routes>/
		 * 	- ./apps/[app-name]/content/modules/<client|server>/
		 * 	- ./apps/[app-name]/logs/
		 * 	- ./apps/[app-name]/<config.js|index.js|package.json>
		 * 	- ./apps/[app-name]/assets/html/<footer.html|header.html>
		 * 	- ./apps/[app-name]/assets/scss/<index.scss>
		 * 	- ./apps/[app-name]/content/routes/<get.js|post.js>
		 * 	- ./apps/[app-name]/logs/<stderr|stdout>.log
		 *
		 * @return {undefined}
		 */
		async build () {
			  let done = false;
			const host = this.domain();
			try {
				let i;
				if (!await this.file(`${host.path}/index.js`)) {
					console.log(`${console.font('>', 32)} Installing ${console.font(`<${host.name}>`, 90)}\n`);
					await fs.mkdir(host.path, { recursive: true });
					i = `../..${host[1] !== 80 ? '/..' : ''}`;
					i = await this.build([
						[ 'assets/' ],
						[ 'assets/html/' ],
						[ 'assets/js/' ],
						[ 'assets/scss/' ],
						[ 'content/' ],
						[ 'content/l10n/' ],
						[ 'content/modules/' ],
						[ 'content/modules/client/' ],
						[ 'content/modules/server/' ],
						[ 'content/pages/' ],
						[ 'content/routes/' ],
						[ 'logs/' ],
						[ 'config.js', [
							`app.set('domain', '${host[0]}');`,
							`app.set('environment', 'development');`,
							`app.set('http.port', ${host[1]});`
						].join('\n') ],
						[ 'index.js', [
							`import 'hekate';`,
							`app.start();`
						].join('\n') ],
						[ 'package.json', JSON.stringify({
							type: "module",
							scripts: {
								update: `${i}/index.mjs update`,
								restart: `${i}/index.mjs restart`,
								start: `${i}/index.mjs start`,
								stop: `${i}/index.mjs stop`,
								build: `${i}/index.mjs build ${host.name}`
							}
						}, null, '\t') ],
						[ 'assets/html/footer.html', [
							`</body>`,
							`</html>`
						].join('\n') ],
						[ 'assets/html/header.html', [
							`<DOCTYPE html>`,
							`<html>`,
							`<head></head>`,
							`<body>`
						].join('\n') ],
						[ 'assets/scss/index.scss' ],
						[ 'logs/stderr.log' ],
						[ 'logs/stdout.log' ],
						[ 'content/routes/get.js' ],
						[ 'content/routes/post.js' ]
					]);
					i && (done = true);
				}
				if (process.argv.length > 4) {
					done = false;
					const local = [];
					const remote = await this.modules(process.argv.slice(4));
					for (const i in remote) {
						local.push({ name: i, host: host });
					}
					done = await this.download(local, remote);
				}
				if (done) {
					this.clear();
					console.log(`${console.font('SUCCESS', 32)} Use ${console.font(`npm start ${host.name}`, '35 -w')} to start the server`);
				} else throw new Error();
			} catch (e) {
				this.clear();
				this.error(e);
			}
		},

		/**
		 * Links the server directory to create the "hekate" module.
		 *
		 * @return {undefined}
		 */
		async postinstall () {
			try {
				const path = this.root.substring(0, this.root.length - 5);
				await sh.exec(`ln -sf '${path}/server' '${path}/node_modules/${this.opts.name}'`);
			} catch (e) {
				this.error(e);
			}
		},

		/**
		 * Restarts a server.
		 *
		 * @return {undefined}
		 */
		async restart () {
			await this.run.stop();
			await this.run.start();
		},

		/**
		 * Starts a server.
		 *
		 * @return {undefined}
		 */
		async start () {
			const host = this.domain();
			if (await this.pid()) {
				console.status('ready', 32);
			} else if (!await this.file(host.path)) {
				await this.prompt('install');
			} else {
				  let pid;
				const tail = sh.spawn('tail', [ '-n1', '-f', './logs/stdout.log' ], { cwd: host.path });
				console.status('starting...', 33);
				tail.stdout.on('data', i => {
					if (new RegExp(Server.RegExp.ready + pid + '\\)$', 'm').test(i.toString())) {
						tail.kill();
						console.status('ready', 32);
					}
				});
				sh.exec(`node '${host.path}' > /dev/null 2>&1 &`, async () => pid = await this.pid());
			}
		},

		/**
		 * Stops a server.
		 *
		 * 1. Server is running, shut down.
		 * 2. Server is not installed, prompt installation.
		 * 3. Server is off, print off.
		 *
		 * @return {Boolean|undefined} Returns true if a server process ID exists.
		 */
		async stop () {
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
		},

		/**
		 * Updates all installations.
		 *
		 * A query is run to https://hekate.app/r/update/@core,<...modules>, where <...modules> is
		 * a list of all modules in all domains. A JSON object is returned containing the latest
		 * version of Hekate.js (@core) and all requested modules.
		 *
		 * If any installed modules are determined to be incompatible with newer versions (i.e.,
		 * major version numbers are different), warnings are printed and the option to continue or
		 * ignore specific updates is allowed.
		 *
		 * After @core and module update, `npm update` is run, which updates dependencies.
		 *
		 * @return {undefined}
		 */
		async update () {
			  let load;
			  let errs = false;
			const mods = [];
			const repo = [{ name: '@core', path: this.root, version: this.opts.version }];
			const tree = await (async () => {
				try { for await (let i of await fs.opendir(this.root)) {
					i.isDirectory() && repo.push(...await this.modules(`${this.root}/${i.name}`));
				}} catch (e) {}
				return this.modules(repo.map(i => i.name));
			})();

			console.log(console.font('WARNING', 33), 'If any of your local installations are incompatible with the latest');
			console.log(console.font('WARNING', 33), '(remote) version, you can choose to update these, or skip them.');
			console.log();
			await this.version(repo[0], tree['@core']);
			for (const i of repo.slice(1)) {
				let updt = tree[i.name];
				updt && updt.version !== i.version && mods.push(await this.version(i, updt));
			}
			console.log();

			// Update modules...
			await this.download(mods, tree);

			// Update Hekate.js...
			if (repo[0].version !== tree['@core'].version) {
				load = this.loading(console.font('<hekate.js>', 90));
				try { await sh.exec('git pull'); }
				catch (e) { this.error(e); }
				load.end();
			}

			// Update Hekate.js node_modules...
			load = this.loading(console.font('<hekate.js/node_modules>', 90));
			sh.spawn('npm', [ 'update' ], { cwd: this.root }).on('close', async () => {
				load.end();
				await this.run.postinstall();
				this.clear();
				console.log(console.font('UPDATE', 32), console.font('<hekate.js/node_modules>', 90));
				console.log(console.font('UPDATE', 32), 'Everything up to date');
				console.log(console.font('UPDATE', 32), 'See ya!');
				process.exit();
			}).stderr.on('data', i => this.error(i));
		}

	};

	constructor () {
		(async () => {
			this.root = process.argv[1].substring(0, process.argv[1].lastIndexOf('/'));
			this.opts = JSON.parse(await fs.readFile(`${this.root}/package.json`));
			this.root += '/apps';
			Object.keys(this.run).map(i => this.run[i] = this.run[i].bind(this));
			this.run[process.argv[2]] && await this.run[process.argv[2]]();
		})();
	};

	/**
	 * Builds from a list of directories or files and outputs the result.
	 *
	 * @param {Array} list The list of items to create.
	 * @return {Boolean|Error} Returns false if all were successful, or an error stack.
	 */
	async build (list) {
		const host = this.domain();
		for await (const i of list) {
			this.clear();
			const name = [ host.path, i[0] ].join('/');
			const text = i[1] || '';
			if (await this.file(name)) {
				process.stdout.write(`${console.font('EXISTS', 33)} ${name}`);
			} else try {
				name.slice(-1) === '/' ? await fs.mkdir(name) : await fs.writeFile(name, text + '\n');
				process.stdout.write(`${console.font('CREATE', 32)} ${name}`)
			} catch (e) {
				this.error(e);
			}
			await Date.setTimeout(25);
		}
	};

	/**
	 * Clears the output to write over it.
	 *
	 * @return {undefined}
	 */
	clear () {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
	};

	/**
	 * Builds a domain from its hostname and port.
	 *
	 * @param {String} host Used as the source host, or read from the directory or process argument.
	 * @return {Array} Returns a domain split by hostname and port number.
	 */
	domain (host) {
		host = [ !host && process.argv[3]
			? process.argv[3].split(':') // host & port determined from argument
			: (host || process.cwd()) // host & port determined from directory
				.substring(this.root.length + 1).split('/')
				.map((i, n) => n || Server.RegExp.ipv4.test(i) ? i : i.split('.').reverse().join('.'))
			]
			.flat()
			.concat([ '' ])
			.map((i, n) => n === 1 ? (i && i != 80 ? +i : 80) : i)
			.slice(0, 2);
		host.path = Server.RegExp.ipv4.test(host[0]) ? host[0] : host[0].split('.').reverse().join('.');
		host.path = `${this.root}/${host.path}${host[1] === 80 ? '' : '/' + host[1]}`;
		host.name = host[1] === 80 ? host[0] : host.join(':');
		if (Server.RegExp.domain.test(host.name)) {
			return host;
		} else {
			this.error('Invalid host name', host.name);
		}
	};

	/**
	 * Downloads module files from the source to local domain installations.
	 *
	 * @param {Array} local A list of local module {Object} installations.
	 * 		- name: Name of the module, prefixed with <@>.
	 * 		- path: Directory where the module is installed.
	 * 		- host: The domain where the module is installed.
	 * @param {Object} remote A list of modules from the source with version and all dependencies.
	 * 		- version: Semver-compliant version number of the source module.
	 * 		- request: All files needed for the module.
	 * @return {Boolean|Error} Returns true if successful, an error message on any failure.
	 */
	async download (local, remote) {
		const dirs = [];
		download: for (const i of local.filter(Boolean)) {
			const dirs = [];
			for (const r of remote[i.name].request) {
				const name = r.split('/').slice(0, 2).join('/');
				const file = r.split('/').slice(2).join('/');
				const path = `${i.host.path}/content/modules/${name}`;
				if (!dirs.includes(path)) {
					dirs.push(path);
					await sh.exec(`rm -rf '${path}/*'`);
				}
				this.clear();
				process.stdout.write([
					console.font('MODULE', 32),
					console.font(`<${i.host[1] === 80 ? i.host[0] : i.host.join(':')}>`, 90),
					`${name}/${file}`
				].join(' '));
				try {
					await sh.exec([
						`curl`,
						`-A hekate/${this.opts.version}`,
						`-o '${path}/${file}'`,
						`--create-dirs`,
						`-sL '${this.opts.repository.url}/update/${name}/${file}'`
					].join(' '));
				} catch (e) {
					this.error(e);
				}
			}
		}
		return true;
	};

	/**
	 * Prints a fatal error message and exits.
	 *
	 * @param {String|Error} error The error full stack, or type of error.
	 * @param {String} text The error message.
	 * @return {undefined}
	 */
	error (error, text) {
		this.clear();
		if (error.stack) {
			const e = error.stack.match(/^(.+): ([^\n]+)\n/) || [];
			text  = error.stderr || e[2];
			error = e[1]?.match(/([^:]+)$/)[1].trim();
		}
		console.log(console.font('ERROR', 31), `${error}:`, console.font(text, 31));
		process.exit(1);
	};

	/**
	 * Synchronously checks if a file exists.
	 *
	 * @param {String} file The file location.
	 * @return {Boolean} Returns true if the file exists, or false.
	 */
	async file (file) {
		try {
			await fs.access(file);
			return true;
		} catch (e) {
			return false;
		}
	};

	/**
	 * Displays a loading message.
	 *
	 * @param {String} text The text to display with animated (...).
	 * @return {Promise} Returns the <setInterval> promise.
	 */
	loading (text) {
		let x = 0;
		return Date.setInterval(() => {
			this.clear();
			process.stdout.write(`${console.font('UPDATE', 32)} ${text} ${'.'.repeat(x++).padEnd(3, ' ')}`);
			x &= 3;
		}, 250);
	};

	/**
	 * Gets a list of modules installed on each domain.
	 *
	 * @param {Array|String} host An array selects versions and dependencies of given modules from
	 * 		the host. A string refers to the <./apps> directory containing hostnames.
	 * @return {Array} Returns a list of modules with their name, path location, and version.
	 */
	async modules (host) {
		let repo = [];
		try {
			if (host instanceof Array) {
				repo = JSON.parse((await sh.exec([
					`curl`,
					`-H "Content-Type: application/json"`,
					`-A "hekate/${this.opts.version}"`,
					`-d '${JSON.stringify(host.unique())}'`,
					`-sL ${this.opts.repository.url}/update`
				].join(' '))).stdout);
			} else {
				host = this.domain(host);
				for await (const app of await fs.opendir(host.path)) {
					if (app.isFile()) { continue; }
					if (app.name === 'content') /** found module directory */ {
						const dir = `${host.path}/${app.name}/modules`;
						await Promise.all(('client|server').split('|').map(async i => {
							if (!await this.file(`${dir}/${i}`)) return false;
							for await (const mod of await fs.opendir(`${dir}/${i}`)) {
								let path;
								if (
									(mod.isDirectory()) &&
									(await this.file(path = `${dir}/${i}/${mod.name}/${mod.name}.js`) ? mod : false)
								) {
									let head = (await sh.exec(`head -n 2 '${path}'`))
										.stdout.trim()
										.split('\n');
									head[0] = (head[0]?.match(Server.RegExp.fversion) || []).slice(1, 3);
									head[1] = (head[1]?.match(Server.RegExp.fdependencies) || [])[1]?.split(',');
									repo.push({
										name: head[0][0] || '@' + path.match(Server.RegExp.pathname)?.[1],
										version: head[0][1] || '0.0.0',
										dependencies: head[1],
										host: host
									});
								}
							}
						}));
					} else if (/^\d+$/.test(app.name)) /* go into port directory */ {
						repo.push(...await this.modules(`${host.path}/${app.name}`));
					}
				}
			}
		} catch (e) {
			this.error(e);
		}
		return repo;
	};

	/**
	 * Checks for the server's process ID.
	 *
	 * @return {Number} Returns the process ID, or <0> if none found.
	 */
	async pid () {
		try {
			const find = `'node ${this.domain().path}'`;
			return +((await sh.exec(`ps aux | grep ${find}`)).stdout
				.trim()
				.split('\n')
				.filter(i => find === `'${i.split(/\s+/).slice(10).join(' ')}'`)?.[0]
				.split(/\s+/)[1] || 0);
		} catch (e) {
			return 0;
		}
	};

	/**
	 * Prompts (Yes/No) user input.
	 *
	 * @param {String} i The name of the prompt to display.
	 * @return {Promise} Returns a promise that contains the yes or no choice as a {Boolean}.
	 */
	async prompt (i) {
		switch (i) {
			case 'install': {
				console.log(console.font('ERROR', 31), `${console.font(`<${this.domain().name}>`, 90)} doesn't exist`);
				await this.prompt(`${console.font('ERROR', 31)} Do you want to create this domain now?`)
					? console.log() || await this.run.build()
					: console.log(console.font('ERROR', 31), 'Leaving in peace...');
				break;
			}
			default: return new Promise(resolve => {
				switch (process.argv[process.argv.length - 1]) {
					case '-y': resolve(true); break;
					case '-n': resolve(false); break;
					default: {
						  let need = false;
						const wait = readline.createInterface({
							input: process.stdin,
							output: process.stdout,
							prompt: `${(i ? `${i} ` : '')}(${console.font('Y', '-s')}es/${console.font('N', '-s')}o): `
						});
						wait.prompt();
						wait.on('line', line => {
							switch ((line.trim().match(Server.RegExp.prompt)?.[0]?.[0] || '').toLowerCase()) {
								case 'y': need = true; return wait.close();
								case 'n': need = false; return wait.close();
							}
							wait.prompt();
						});
						wait.on('close', () => resolve(need));
					}
				}
			});
		}
	};

	/**
	 * Determines version differences between local and remote modules.
	 *
	 * @param {Object} l The local version of a module.
	 * @param {Object} r The remote version of a module.
	 * @return {Object|undefined} Returns the remote version if it's going to be updated.
	 */
	async version (l, r) {
		const name = `${console.font(`<${l.host ? l.host.name : 'hekate.js'}>`, 90)} ${l.name}:`;
		  let file;
		l.version === r.version
			? console.log(console.version(name, [ l.version, 32 ]) ) // Local and remote versions are identical.
			: semver.satisfies(...(semver.lt(l.version, r.version)
				? [ r.version, `^${l.version}` ] // local is older
				: [ l.version, `^${r.version}` ] // local is newer (?)
			))
			? (file = l) && console.log(console.version(name, // Local and remote versions are compatible.
				[ l.version, semver.eq(l.version, r.version) || semver.lt(l.version, r.version) ? 33 : 32 ], // local is older
				[ r.version, semver.eq(l.version, r.version) || semver.lt(l.version, r.version) ? 32 : 33 ]  // local is newer
			))
			// Local version is incompatible with remote version, confirm update.
			: await this.prompt(console.version(name, [ l.version, 31 ], [ r.version, 32 ])) && (file = l);
		return file;
	};

};

(async () => {
	await import('./server/primitive/array.js');
	await import('./server/primitive/date.js');
	await import('./server/console.js');
	new Server;
})();
