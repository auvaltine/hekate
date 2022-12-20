const Clients = {};
export default {

	/**
	 * Sets up a new client limiter for the given IP address.
	 *
	 * @param {String} ip: The client's IP address.
	 * @return {Object} Returns the limiter object if one exists or was created.
	 */
	Client (ip) {
		const limit = app.get('limit') || {};
		return Clients[ip] || (Clients[ip] = (() => {
			Date.setTimeout(() => delete Clients[ip], app.get('session.expires') || 900000);
			const client = {
				status: Object.fromEntries(Object.keys(limit).map(fn => [fn, { requests: 0, expires: null } ])),
				limits (method) /* Calculate response limits */ {
					if (this.status[method]) {
						const limits = limit[method];
						const status = this.status[method];
						return {
							remaining: limits[0] - ++status.requests,
							requests: limits[0],
							resets: ((status.expires || (status.expires = Date.setTimeout(() => {
								status.requests = 0;
								status.expires = null;
							}, limits[1] * 1000))).date() - new Date()) / 1000,
							time: limits[1]
						};
					}
					return true;
				}
			};
			return client;
		})());
	},

	/**
	 * Sets the response rate headers and prevents access if limit reached.
	 *
	 * @param {Stream} request: The HTTP request stream.
	 * @param {Stream} response: The HTTP response stream.
	 * @param {Object} i: The client's request limiter.
	 * @return {Boolean} Returns true if the request limit has not been reached, or false if it has.
	 */
	Headers (request, response, i) {
		response.setHeader('RateLimit-Limit', i.requests);
		response.setHeader('RateLimit-Remaining', i.remaining < 0 ? 0 : i.remaining);
		response.setHeader('RateLimit-Reset', i.resets);
		if (i.remaining >= 0) {
			return true;
		} else {
			response.statusCode = 429;
			response.setHeader('Retry-After', i.resets);
			response.end(`<!DOCTYPE html><html><body>`
				+ `<h1>429 Too Many Requests</h1>`
				+ `<p>IP address: <code>${request.ip}</code></p>`
				+ `<p>This server allows ${i.requests} requests every ${i.time} seconds.<br>Try again after ${i.resets} seconds.</p>`
				+ '</body></html>');
			return false;
		}
	}
};
