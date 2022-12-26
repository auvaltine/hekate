import fs						  from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import Cookie					  from 'hekate/cookie.js';
import Limiter					  from 'hekate/limiter.js';
import Network					  from 'hekate/network.js';
import Mime						  from 'hekate/mime.js';
import Parser					  from 'hekate/parser.js';
import Response					  from 'hekate/response.js';
import Session					  from 'hekate/session.js';

export default Request = {

	RegExp: {
		IP: /[^\d\.]/g,
		Log: /%([a-z])/gi,
		Page: /\/page\/(\d+)$/
	},

	Listen: [

		/**
		 * Creates request and response properties and methods.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {undefined}
		 */
		async (request, response) => {
			Object.defineProperty(request, 'time', /* Time of request */ { value: new Date() });
			Object.defineProperty(request, 'uuid', /* Unique identifier */ { value: randomUUID() });
			Object.defineProperty(request, 'ip', /* Attempt to get the true IP address */ {
				value: (request.headers['x-real-ip'] ||
					(request.headers['x-forwarded-for'] || '').split(',')[0] ||
					(request.socket.remoteAddress) ||
					('')).trim() || ''
			});
			Object.defineProperty(request, 'xhr', /* AJAX? */ {
				value: (request.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest'
			});
			Object.keys(Response).forEach(i => /* Response methods */ typeof Response[i] === 'function'
				&& Object.defineProperty(response, i, { value: Response[i] }));
			Object.defineProperty(response, 'view', /* Template view variables */ { value: {} });
		},

		/**
		 * Gets the requested URL.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {undefined}
		 */
		async (request) => {
			const http = 'http' + (app.get('https') ? 's' : '');
			const host = request.headers[request.httpVersion === '2.0' ? ':authority' : 'host'];
			const orig = request.url;
			request.url = new URL(`${http}://${host}${request.url}`);
			request.url.request = orig;
			request.url.page = (request.url.pathname.match(Request.RegExp.Page) || [ , 1 ]);
			request.url.pathname = request.url.pathname.substring(0, request.url.page.index);
			request.url.page = request.url.page[1];
		},

		/**
		 * Checks for restricted IP addresses or user agents.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {Boolean|undefined} If a restricted match was found, returns false to kill the
		 * 		connection.
		 */
		async (request, response) => {
			const ip = request.ip.replace(Request.RegExp.IP, '');
			const ua = request.headers['user-agent'];
			for (const i of [ ...app.get('deny.ip'), ...app.get('deny.ua') ]) {
				if (i instanceof Network ? i.includes(ip)
				  : i instanceof RegExp ? i.test(ua)
				  : i === ua
				) {
					response.statusCode = 403;
					response.destroy();
					app.get('log.denied') == false && (request.log = false);
					return false;
				}
			}
		},

		/**
		 * Gets the requested file location.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {undefined}
		 */
		async (request) => {
			const path = request.url.pathname;
			const good = app.get('allow');
			const evil = app.get('deny').find(i => i.test(path));
			let i = path.lastIndexOf('.html');
				i = ~i ? path.substring(0, i) : path;
			if ((evil && good.find(i => i.test(path))) || !evil) {
				const self = `${app.root}${path}`;
				for (let file of [ self, ...(path === '/'
					? [ `${app.page}/index.html` ]
					: [ `${app.page}${i}.html`, `${app.page}${i}/index.html` ]
				)]) {
					if ((request.file = await app.file(file))) {
						request.file.method = request.file.path === self ? 'static' : 'dynamic';
						break;
					}
				}
			}
			request.file || (request.file = { type: 'text/html; charset=utf-8' });
		},

		/**
		 * Checks for access limits.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {Boolean} Returns false if too many requests attached to the client's IP address.
		 */
		async (request, response) => {
			const pass = app.get('limit') ? Limiter.Client(request.ip).limits(request.file.method || 'dynamic') : true;
			app.get('https') && response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
			if (typeof pass === 'object' ? Limiter.Headers(request, response, pass) : true) {
				if (app.get('session') != false) {
					request.session = Session.Find(request.headers.cookie || '', this);
					response.setCookie(request.session._id);
				}
				if (request.method === 'POST') {
					request.post = await new Parser(request);
					request.session && (request.session.post = request.post);
				}
				return true;
			}
			return false;
		},

		/**
		 * Runs module requests and HTTP verb listeners.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {*} Returns the value of the last triggered listener.
		 */
		async (request, response, emit) => {
			for (const fn of [ ...Object.keys(module), ...(app.on[`http.${request.method.toLowerCase().toCamelCase()}`] || []) ]) {
				if (fn.match instanceof RegExp) /* HTTP verbs */ {
					emit = (emit = request.url.pathname.match(fn.match))
						 ? (request.url.params = emit.slice(1)) && await fn(request, response)
						 : undefined;
				} else if ((emit = module[fn])) /* Modules */ {
					emit = typeof emit === 'function' ? await emit(request, response)
						 : typeof emit.request === 'function' ? await emit.request(request, response)
						 : undefined;
				} else {
					emit = undefined;
				}
				if (emit === false) {
					return false;
				} else if (emit !== undefined) {
					break;
				}
			}
			typeof request.file === 'object' || (request.file = { type: 'text/html' });
		},

		/**
		 * Builds the page and sends it to the client.
		 *
		 * @param {Stream} request: The HTTP request stream.
		 * @param {Stream} response: The HTTP response stream.
		 * @return {undefined}
		 */
		async (request, response) => {
			if (request.method === 'POST') {
				if (request.xhr) {
					await response.json(request.post);
				} else {
					response.statusCode = 303;
					response.setHeader('Location', request.url.href);
				}
			} else {
				response.setHeader('Content-Type', request.file.type + Mime.Charset(request.file.type));
				request.method !== 'HEAD' && await response[Response[request.file.method] ? request.file.method : 'dynamic']();
			}
		}
	],

	/**
	 * On a new incoming HTTP/S request, the array of Request.Listen functions are triggered in
	 * succession. Listen functions build the Request and Response methods, and trigger modules and
	 * HTTP verb events. If any return a boolean false value, the loop is broken.
	 *
	 * Client Connect -> Server -> Request -> Incoming -> Listen 0 1 2 3 4 5 (Deliver) -> Log
	 *
	 * @param {Stream} request The HTTP request stream.
	 * @param {Stream} response The HTTP response stream.
	 * @return {undefined}
	 */
	Incoming: async (request, response) => {
		for (let i = 0; i < Request.Listen.length; i++) {
			if (await Request.Listen[i](request, response) === false) {
				break;
			}
		}
		if ((request.xhr || request.method !== 'POST') && request.session?.post) {
			delete request.session.post;
		}
		response.writableEnded || response.end();
		app.get('log.http') != false && request.log !== false && Request.Log(request, response);
	},

	/**
	 * Logs an HTTP request.
	 *
	 * Server logs -> ./apps/[app-name]/logs/server[-#].log
	 * <date:rfc3339> %a "%r" %s %B %Fms "%f" "%u"
	 *
	 * @param {Stream} request The HTTP request stream.
	 * @param {Stream} responses The HTTP response stream.
	 * @return {undefined}
	 */
	Log: async (request, response) => {
		const head = request.headers;
		const stat = response.statusCode >= 400 ? 31
				   : response.statusCode >= 200 ? 32
				   : 90;
		const logs = {};
		logs.a = request.ip;
		logs.B = response.length
			|| response[Object.getOwnPropertySymbols(response).find(i => i.toString() === 'Symbol(stream)')]?._writableState.length
			|| request.file?.size
			|| '-';
		logs.f = head.referer && new URL(head.referer).host != app.get('domain') ? head.referer : '-';
		logs.F = new Date() - request.time;
		logs.h = createHash('md5').update(head['user-agent'] || '').digest('hex');
		logs.H = 'HTTP/' + (head[':authority'] ? '2' : '1.1');
		logs.m = request.method;
		logs.s = response.statusCode;
		logs.r = `${logs.m} ${request.url.request} ${logs.H}`,
		logs.R = `${logs.m} ${request.url} ${logs.H}`,
		logs.T = (new Date() - request.time) / 1000;
		logs.u = head['user-agent'] || '-';
		logs.U = request.url.request;
		await app.emit('request.log', logs, request, response);

		// Log body text
		if (request.method === 'POST') {
			const trim = app.get('log.trim');
			const text = app.get('log.trimText');
			logs.d = JSON.stringify(request.post?.data || '{}');
			if (logs.d.length > trim + 2) {
				logs.d = [ logs.d[0], logs.d.slice(0, -1), logs.d.slice(-1) ];
				logs.d[1] = `${logs.d[1].slice(1, trim)} ... ${text.replace('%s', logs.d[1].length - trim)}`;
				logs.d = logs.d.join('');
			}
		} else {
			logs.d = '';
		}

		app.log(request.time, app.get('log.http').replace(Request.RegExp.Log, (...i) => console.font(logs[i[1]],
			   (i[1] === 'a' && 36)
			|| (i[1] === 'B' && 33)
			|| (i[1] === 'f' && 90)
			|| (i[1] === 'F' && 35)
			|| (i[1] === 's' && 33)
			|| (i[1] === 'r' && stat)
			|| (i[1] === 'R' && stat)
			|| (i[1] === 'T' && 35)
			|| (i[1] === 'u' && 90)
			|| (i[1] === 'U' && 90)
			|| ('0')
		)).replace(/(?:\x1b\[\d+m){2,}/g, '').trim());
	}
};
