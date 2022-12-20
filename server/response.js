import fs					from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import zlib					from 'node:zlib';
import Cookie				from 'hekate/cookie.js';
import Template				from 'hekate/template.js';

export default Response = {

	RegExp: {
		GzipEncode: /(?:(?:application\/(?:json|(?:(?:xhtml|rss)\+)?xml|vnd\.ms-fontobject|x-(?:font(?:-(?:opentype|otf|truetype|ttf))?)))|font\/(?:opentype|otf|ttf)|image\/(?:svg\+xml|x-icon)|text\/(?:cs[sv]|html|javascript|plain|xml))(;.*)?$/,
		GzipAccept: /\bgzip\b/,
	},
	getCookie: Cookie.getCookie,
	setCookie: Cookie.setCookie,
	removeCookie: Cookie.removeCookie,

	/**
	 * Applies the <gzip> Content-Encoding if the file and client allow for it.
	 *
	 * @return {Boolean} Returns true if <gzip> was set.
	 */
	gzip () {
		const request = this.req;
		return Response.RegExp.GzipEncode.test(request.file.type)
			&& Response.RegExp.GzipAccept.test(request.headers['accept-encoding'])
			&& (this.setHeader('Content-Encoding', 'gzip') || true);
	},

	/**
	 * Sends the response as a JSON-encoded string.
	 *
	 * @param {Object} json: An object to convert to a JSON string.
	 * @return {Boolean} Returns false to stop the request flow.
	 */
	async json (json) {
		const request = this.req;
		json = JSON.stringify(json);
		this.setHeader('Content-Type', request.file.type = 'application/json; charset=utf-8');
		this.gzip() && (json = await new Promise(resolve => zlib.gzip(json, (e, json) => resolve(json))));
		this.setHeader('Content-Length', json.length);
		this.end(json);
		return false;
	},

	/**
	 * Redirects the response with a 302 status.
	 *
	 * @param {String} path: The URL path location to redirect.
	 * @return {Boolean} Returns false to stop the request flow.
	 */
	redirect (path) {
		this.statusCode = 302;
		this.setHeader('Location', path);
		this.end();
		return false;
	},

	/**
	 * Applies arguments to a template literal string.
	 *
	 * @param {String} html: The HTML string with ${} properties.
	 * @param {Object} args: Arguments to pass through the HTML for use as <thisArg>.
	 * @return {String} Returns the processed template string.
	 */
	async template (html, args) {
		const request = this.req;
		  let fn = 'return {body:`' + html.toString('utf8') + '`.trim(),args:this};';
		try {
			return await (async function () {}).constructor(fn).call({
				...this.view,
				...app.get('view'),
				file: request.file,
				post: key => request.walk(`session.post.data.${key}`) || '',
				session: request.session,
				ip: request.ip,
				url: request.url,
				...(args || {})
			});
		} catch (e) {
			app.error(console.font(`${e.constructor.name}: ${e.message}`, 31) + ` in ` + console.font('eval\'d template', 31));
		}
	},

	/*
	 * Processes static files. If <config.environment> is <production>, caching is also enabled here.
	 *
	 * @return {undefined}
	 */
	async static () {
		const request = this.req;
		const file = request.file;
		this.removeCookie('session');
		if (file.etag === request.headers['if-none-match']) {
			this.statusCode = 304;
		} else {
			if (app.get('environment') == 'production') {
				this.setHeader('Cache-Control', 'max-age=31536000');
				this.setHeader('Etag', file.etag);
			} else {
				this.setHeader('Cache-Control', 'no-cache');
			}
			await new Promise(resolve => {
				let stream = createReadStream(file.path);
				this.gzip() && (stream = stream.pipe(zlib.createGzip()));
				stream.pipe(this);
				stream.on('end', () => {
					this.length = stream.bytesWritten;
					resolve();
				});
			});
		}
	},

	/**
	 * Processes dynamic file (i.e., files created via HTTP verbs).
	 *
	 * @return {undefined}
	 */
	async dynamic () {
		const request = this.req;
		const html = `${app.root}${app.get('template.directory')}/html`;
		let file = typeof request.file !== 'object' ? {} : request.file;
		let body = file.body || '';
		try {
			if (this.statusCode === 500) {
				throw new Error;
			}
			if (body || file.path) {
				body = body || await fs.readFile(file.path);
				body = file.raw ? body : await Template.Build(this, body);
			} else {
				this.statusCode = 404;
				body = (file = Template.Files.get(`${html}/404.html`))
					 ? await Template.Build(this, file.body)
					 : `<!DOCTYPE html><html><body><h1>404 Page Not Found</h1></body></html>`;
			}
		} catch (e) {
			this.statusCode = 500;
			try {
				this.view.error = e;
				file = Template.Files.get(`${html}/500.html`);
				body = await Template.Build(this, file.body);
			} catch (i) {
				body = `<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1><pre>${e}</pre></body></html>`;
			}
		}
		this.gzip() && (body = await new Promise(resolve => zlib.gzip(body, (e, body) => resolve(body))));
		this.setHeader('Content-Length', this.length = body.length);
		this.end(body);
	}

};
