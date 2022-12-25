import cluster				   from 'node:cluster';
import crypto				   from 'node:crypto';
import fs					   from 'node:fs/promises';
import http					   from 'node:http';
import net					   from 'node:net';
import stream				   from 'node:stream';
import { readFileSync, watch } from 'node:fs';
import { cpus }				   from 'node:os';
import Mime					   from 'hekate/mime.js';
import Template				   from 'hekate/template.js';

export default class Primary {

	static RegExp = {
		archive: /-[0-9]{13,}\.log$/,
		dots: /\./g,
		nums: /\D/g
	};

	/**
	 * Defines methods for the primary/parent app.
	 *
	 * @return {undefined}
	 */
	static async methods () {
		http.METHODS.concat([ 'SOCKET' ]).map(i => (i = i.toLowerCase().toCamelCase()) &&

		/**
		 * Defines HTTP routing verbs for all methods listed in http.METHODS and "socket".
		 *
		 * @param {RegExp|String} pattern: Defines a URL pattern for verbs, event name for socket
		 * 		".on", or dot-notated string for app.get() configuration option.
		 * @param {Function} fn: Function that is called when an event is triggered.
		 * @return {Boolean|undefined}
		 */
		Object.defineProperty(app, i, /* Define HTTP routing verbs */ {
			value: (...args) => i === 'get' && !args[1]
				? app.set.walk(args[0])
				: (args[1].match = typeof args[0] === 'string'
					? new RegExp('^' + args[0].replace(Primary.RegExp.dots, '\\.') + (i === 'socket' ? '(?:\\..+|$)' : '$'))
					: args[0]) && app.on(`http.${i}`, args[1])
		}));

		/**
		 * Defines a sender for a WebSocket handler.
		 *
		 * @param {String} event: A dot-notated string containing the socket event.
		 * @param {*} data: The data payload to pass to sockets.
		 * @param {Array|Stream|String} sockets: A list of sockets, individual socket, or an "_id"
		 * 		string defining a socket.
		 * @return {undefined}
		 */
		Object.defineProperty(app.socket, 'send', /* Socket message sender */ {
			value: (event, data, sockets) => process.send({ event: 'socket', data: { event, data }, socket: (
				  sockets instanceof stream.Duplex ? [ sockets ]
				: sockets instanceof Array ? sockets.map(i => i instanceof stream.Duplex ? i._id : typeof i === 'string' ? i : undefined)
				: typeof sockets === 'string' ? [ sockets ]
				: []
			).filter(Boolean) })
		});

		/**
		 * Checks if a file exists and returns specific properties.
		 *
		 * @param {String} path: A string containing the file location.
		 * @return {Object|undefined} Returns an object if the file exists:
		 * 		@param {String} etag: MD5 hash of the file identifier, size, and modified time.
		 * 		@param {Number} open: Unix date when the file was opened.
		 * 		@param {Number} mtime: Unix date when the file was last modified.
		 * 		@param {String} path: A string containing the file location.
		 * 		@param {Number} size: The file's size in bytes.
		 * 		@param {String} type: A string containing the file's MIME type.
		 */
		Object.defineProperty(app, 'file', { value: async function file (path) {
			try {
				await fs.access(path);
				const file = await fs.stat(path);
				return file.isFile() ? {
					etag: crypto.createHash('md5').update([ file.ino, file.size, file.mtime.getTime() ].join('')).digest('hex'),
					open: file.atime,
					mtime: file.mtime,
					path: path,
					size: file.size,
					type: Mime.Type(path)
				} : undefined;
			} catch (e) {}
		}});

		/**
		 * Retrieves or sets localization translation keys.
		 *
		 * @param {Object|String} lang: As a string, the language identifier to use, or an object
		 * 		with a key, "lang" (e.g., <request.session>).
		 * @param {Object|undefined} keys: An object that defines key-translation strings.
		 * @return {Object} Returns an object with keys matching the defined language.
		 */
		Object.defineProperty(app, 'l10n', { value: function l10n (lang, keys) {
			if (typeof lang === 'object') { lang = lang.lang || 'en'; }
			if (typeof lang === 'string' && (lang.length > 2 || keys)) {
				const json = keys === undefined ? JSON.parse(readFileSync(lang, 'utf8')) : typeof keys === 'object' ? keys : {};
				lang = lang.length > 2 ? lang.substring(lang.lastIndexOf('/'), 2) : lang;
				app.l10n[lang] = Object.merge(app.l10n[lang] || (app.l10n[lang] = {}), json);
			}
			return (lang = app.l10n[lang] ? lang : app.l10n.en ? 'en' : null) ? app.l10n[lang] : {};
		}});
		try { (await fs.readdir(`${app.root}/content/l10n`)).map(i => app.l10n(`${app.root}/content/l10n/${i}`)); } catch (e) {}
	};

	/**
	 * Spawns children on each available CPU core (up to the limit defined by <app.set.clusters> or
	 * the available cores.
	 *
	 * @return {Primary}
	 */
	constructor () {
		this.logs();
		(async () => {
			await new Template(true);
			await this.cluster();
		})();
	};

	/**
	 * Forks child processes onto available cores to distribute server load.
	 *
	 * @return {undefined}
	 */
	async cluster () {
		const work = [];
		  let core = +app.get('cluster');
		app.set('cluster', !core || core > cpus().length || isNaN(core) ? cpus().length : core);
		app.set('cluster.length', 0);
		core = app.get('cluster').valueOf();
		function fork (i) {
			work[i] = cluster.fork();
			work[i].on('error', app.error.bind(app));
			work[i].on('exit', (worker, code) => {
				app.set('cluster.loaded', app.get('cluster.loaded') - 1);
				code === 'SIGKILL' ? process.kill(process.pid, code) : fork(i);
			});
			work[i].on('message', i => {
				switch (i.event) {
					case 'listen': {
						app.set('cluster.length', app.get('cluster.length') + 1);
						app.log(console.font('Worker listening', 32), console.font(`:${i.data}`, 33));
						app.get('cluster').valueOf() === app.get('cluster.length').valueOf()
							&& app.log(console.font('Ready', 32), `(PID:${console.font(process.pid, 33)})`);
						break;
					}
					case 'socket': work.map(w => w.send({ event: 'socket', data: i.data, sockets: i.sockets })); break;
				}
			});
		};
		for (let i = 0; i < core; i++) {
			fork(i);
		}
		(await this.server())
			.on('connection', conn => {
				const i = +conn?.remoteAddress?.replace(Primary.RegExp.nums, '') % core;
				work[i]?.send({ event: 'connection' }, conn) || conn?.destroy();
			})
			.on('listening', function () {
				app.log(console.font('Server listening', 32), console.font(`:${this.address().port}`, 33));
			});
		process.on('exit', () => work.map(i => i.kill()));
	}

	/**
	 * Cycles log files that reach too large a size and are too old.
	 *
	 * @return {undefined}
	 */
	logs () {
		watch(app.logs, async (event, name) => {
			if (!watch.archiving[name]
				&& !Primary.RegExp.archive.test(name)
				&& (await fs.stat(`${app.logs}/${name}`)).size > app.get('log.size')
			) {
				watch.archiving[name] = true;
				await fs.copy(`${app.logs}/${name}`, `${app.logs}/${name.substring(0, name.length - 4)}-${Date.now()}.log`);
				await fs.truncate(`${app.logs}/${name}`);
				delete watch.archiving[name];
			}
		});
		watch.archiving = {};
		Date.setTask(`0 0 * * *`, async () => /* Remove logs older than <config.log.cycle> days */ {
			const date = new Date();
			const time = app.get('log.cycle') * 8.64e+7;
			for await (let i of await fs.opendir(app.logs)) {
				(Primary.RegExp.archive.test(i.name)) &&
				(await fs.stat(`${app.logs}/${i.name}`)).mtime - date > time &&
				(await fs.rm(`${app.logs}/${i.name}`));
			}
		});
	};

	/**
	 * Creates a server, and if HTTPS, another server to reroute to the secure side.
	 *
	 * @return {Server} Returns the server that will be used to handle incoming requests.
	 */
	async server () {
		const config = { http: app.get('http'), https: app.get('https') };
		const domain = app.get('domain');
		const server = net.createServer({ pauseOnConnect: true });
		let port = config.http.port.valueOf() || 80;
		if ('cert|key|port'.split('|').every(i => i in config.https)) try {
			await fs.access(config.https.cert.valueOf());
			await fs.access(config.https.key.valueOf());
			http.createServer() // Create an HTTP server to redirect to HTTPS
				.listen(port, () => app.log(console.font('Server listening', 32), console.font(`:${config.http.port || 80}`, 33)))
				.on('request', (request, response) => {
					response.writeHead(308, { 'Location': `https://${domain}${request.url}` });
					response.end();
				});
			port = config.https.port.valueOf();
		} catch (e) {
			app.error(e);
		}
		return server.listen(port);
	};
};
