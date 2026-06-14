import cluster from 'node:cluster';
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';
import Network from 'hekate/network';
import Primary from 'hekate/primary';
import Template from 'hekate/template';
import Request from 'hekate/request';
import WebSocket from 'hekate/websocket';

export default class Server {

	static RegExp = {
		module: /^(?:get|load)$/
	};

	/**
	 * Creates a child server by loading routing methods and setting allowed/denied ip addresses,
	 * files, and directories.
	 * directories.
	 *
	 * @return {Server}
	 */
	constructor () {
		(async file => {
			await Primary.methods();
			await Promise.all(Object
				.keys(app.module)
				.filter(i => !Server.RegExp.module.test(i))
				.map(async i => await app.module.load(i))
			);
			try {
				await Promise.all((await fs.readdir(`${app.root}/content/routes`)).map(async i => {
					i.substring(i.lastIndexOf('.')) === '.js' && await import(`${app.root}/content/routes/${i}`);
				}));
				app.set('allow', app.get('template.directory'));
				app.get('allow').forEach((r, i, arr) => arr[i] = new RegExp('^' + r));
				app.get('deny').forEach((r, i, arr) => arr[i] = new RegExp('^' + r));
				app.get('deny.ip').forEach((r, i, arr) => arr[i] = new Network(r));
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
		const server = (await (async () => {
				let conf;
				try {
					conf = await Primary.secure();
					  // When an SSL file changes, stop the server after 5 seconds to trigger a
					  // reload of the new certificate and key.
					  let tic = [ conf.cert.path, conf.key.path ].map(i => watch(i, () => {
						clearTimeout(tic);
						tic = setTimeout(async () => {
							try {
								if ((conf = await Primary.secure())) {
									process.disconnect();
								} else {
									app.error('https.cert');
								}
							} catch (e) {
								app.error(e);
								app.error('https.cert');
							}
						}, 5000);
					  }));
					return conf
					   ? http2.createSecureServer({
							allowHTTP1: true,
							cert: conf.cert.file,
							key: conf.key.file
						})
						: undefined;
				} catch (e) {
					app.error(e);
					app.error('https.cert');
					delete app.set.https;
					return http.createServer();
				}
			})())
			.listen(0, '::', () => process.send({ event: 'listen', data: server.address().port }))
			.on('request', async (request, response) => /* HTTP/S requests */ {
				if ((request.headers[':authority'] ? request.headers[':authority'] : request.headers.host) != domain) {
					response.writeHead(301, { Location: `http${app.get('https') ? 's' : ''}://${domain}${request.url}` });
					response.end();
				} else await Request.Incoming(request, response);
			})
			.on('upgrade', (request, socket) => /* WebSocket requests */ {
				if (request.headers['upgrade']?.toLowerCase() === 'websocket') {
					new WebSocket(request, socket);
				} else {
					socket.end('HTTP/1.1 400 Bad Request');
				}
			});
		process.on('message', (i, socket) => {
			switch (i.event) {
				case 'connection': socket && server.emit('connection', socket.resume()); break;
				case 'socket': WebSocket.Send(i.data, i.sockets?.length ? i.sockets : undefined); break;
			}
		});
	};

};
