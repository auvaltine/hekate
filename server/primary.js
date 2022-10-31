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
		dots: /\./g,
		logs: /^std(?:err|out)-[0-9]{13,}\.log$/,
		nums: /\D/g
	};

	/**
	 * Defines methods for the primary/parent app.
	 *
	 * @return {undefined}
	 */
	static async methods () {
		Object.defineProperty(app, 'page', { value: `${app.root}/content/pages` });
		http.METHODS.concat([ 'SOCKET' ]).map(i => (i = i.toLowerCase().toCamelCase()) &&
		Object.defineProperty(app, i, /* Define HTTP routing verbs */ {
			value: (...args) => i === 'get' && !args[1]
				? app.set.walk(args[0])
				: (args[1].match = typeof args[0] === 'string'
					? new RegExp('^' + args[0].replace(Primary.RegExp.dots, '\\.') + (i === 'socket' ? '(?:\\..+|$)' : '$'))
					: args[0]) && app.on(`http.${i}`, args[1])
		}) &&
		Object.defineProperty(app[i], 'methods', { value: [] }));
		Object.defineProperty(app.socket, 'send', /* Socket message sender */ {
			value: (event, data, sockets) => process.send({ event: 'socket', data: { event, data }, socket: (
			  	sockets instanceof stream.Duplex ? [ sockets ]
				: sockets instanceof Array ? sockets.map(i => i instanceof stream.Duplex ? i._id : typeof i === 'string' ? i : undefined)
				: typeof sockets === 'string' ? [ sockets ]
				: []
			).filter(Boolean) })
		});
		Object.defineProperty(app, 'file', { value: async function file (path) {
			try {
				await fs.access(path);
				const file = await fs.stat(path);
				return file.isFile() ? {
					etag: crypto.createHash('md5').update([ file.ino, file.size, file.mtime.getTime() ].join('')).digest('hex'),
					open: file.atime,
					path: path,
					size: file.size,
					type: Mime.Type(path)
				} : undefined;
			} catch (e) {}
		}});
		Object.defineProperty(app, 'l10n', { value: function l10n (lang, session) {
			if (typeof lang === 'object') { lang = lang.lang || 'en'; }
			if (typeof lang === 'string' && (lang.length > 2 || session)) {
				const json = session === undefined ? JSON.parse(readFileSync(lang, 'utf8')) : typeof session === 'object' ? session : {};
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
		const work = [];
		const logs = `${app.root}/logs`;
		  let core = +app.get('cluster');
		app.set('cluster', !core || core > cpus().length || isNaN(core) ? cpus().length : core);
		app.set('cluster.length', 0);
		core = app.get('cluster').valueOf();
		(async () => {
			for (let i = 0; i < core; i++) {
				(function fork (i) {
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
				})(i);
			}
			(await new Template(true));
			(await this.server())
				.on('connection', i => work[+i?.remoteAddress?.replace(Primary.RegExp.nums, '') % core]?.send({ event: 'connection' }, i)
					|| i?.destroy())
				.on('listening', function () { app.log(console.font('Server listening', 32), console.font(`:${this.address().port}`, 33)); });
			('err|out').split('|').map(i => {
				let copy = false;
				i = `${logs}/std${i}`;
				watch(`${i}.log`, async () => /* Truncate logs when they get larger than <config.log.size> */ {
					if (!copy && (await fs.stat(`${i}.log`)).size > app.get('log.size')) {
						copy = true; // file is being copied, be patient
						await fs.copyFile(`${i}.log`, `${i}-${Date.now()}.log`);
						await fs.truncate(`${i}.log`);
						copy = false;
					}
				});
			});
			Date.setTask(`0 0 * * *`, async () => /* Remove logs older than <config.log.cycle> days */ {
				const date = new Date();
				const time = app.get('log.cycle') * 8.64e+7;
				for await (let i of await fs.opendir(logs)) {
					(Primary.RegExp.logs.test(i.name)) &&
					(await fs.stat(`${logs}/${i.name}`)).mtime - date > time &&
					(await fs.rm(`${logs}/${i.name}`));
				}
			});
			process.on('exit', () => work.map(i => i.kill()));
		})();
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
					response.writeHead(301, { 'Location': `https://${domain}${request.url}` });
					response.end();
				});
			port = config.https.port.valueOf();
		} catch (e) {
			app.error(e);
		}
		return server.listen(port);
	};
};
