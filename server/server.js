import cluster	 from 'node:cluster';
import fs		 from 'node:fs/promises';
import { watch } from 'node:fs';
import http		 from 'node:http';
import http2	 from 'node:http2';
import tls		 from 'node:tls';
import Network	 from 'hekate/network.js';
import Primary	 from 'hekate/primary.js';
import Template	 from 'hekate/template.js';
import Request	 from 'hekate/request.js';
import WebSocket from 'hekate/websocket.js';

export default class Server {

	/**
	 * Creates a child server by loading routing methods and setting allowed/restricted files and
	 * directories.
	 *
	 * @return {Server}
	 */
	constructor () {
		(async file => {
			await Primary.methods();
			await Promise.all(Object.keys(module).map(async i => await app.module.load(i)));
			try {
				await Promise.all((await fs.readdir(`${app.root}/content/routes`)).map(async i => {
					i.substring(i.lastIndexOf('.')) === '.js' && await import(`${app.root}/content/routes/${i}`);
				}));
				app.set('allowed', app.get('template.directory'));
				app.set.allowed.forEach((r, i) => app.set.allowed[i] = new RegExp('^' + r));
				app.set.restricted.forEach((r, i) => app.set.restricted[i] = new RegExp('^' + r));
				app.set.restricted.ip.forEach((r, i) => app.set.restricted.ip[i] = new Network(r));
				await new Template();
				this.listen();
			} catch (e) {
				app.error(e);
			}
		})();
	};

	/**
	 * Listens for requests on the child server.
	 *
	 * @return {Server}
	 */
	async listen () {
		const domain = app.get('domain');
		const config = { http: app.get('http'), https: app.get('https') };
		const server = (await (async () => {
				if ('cert|key|port'.split('|').every(i => i in config.https)) try {
					const crt = config.https.cert.valueOf();
					const key = config.https.key.valueOf();
					let tic = [ crt, key ].map(i => watch(i, () => clearTimeout(tic) || (tic = setTimeout(process.disconnect.bind(process), 5000))));
					return http2.createSecureServer({ allowHTTP1: true, cert: await fs.readFile(crt), key: await fs.readFile(key) });
				} catch (e) {}
				delete app.set.https;
				return http.createServer();
			})())
			.listen(0, '::', () => process.send({ event: 'listen', data: server.address().port }))
			.on('request', async (request, response) => /* HTTP/S requests */ {
				if ((request.headers[':authority'] ? request.headers[':authority'] : request.headers.host) != domain) {
					response.writeHead(301, { Location: `http${app.get('https') ? 's' : ''}://${domain}${request.url}` });
					response.end();
				} else await Request.Incoming(request, response);
			})
			.on('upgrade', (request, socket) => /* WebSocket requests */ {
				if (request.headers['upgrade'] === 'websocket') {
					new WebSocket(request, socket);
				} else {
					socket.end('HTTP/1.1 400 Bad Request');
				}
			});
		process.on('message', (i, socket) => {
			switch (i.event) {
				case 'connection': socket && server.emit('connection', socket.resume()); break;
				case 'socket': WebSocket.Send(i.data, i.sockets.length ? i.sockets : undefined); break;
			}
		});
	};

};
