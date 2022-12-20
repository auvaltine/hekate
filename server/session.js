import { createHash, randomUUID } from 'node:crypto';
import Cookie					  from 'hekate/cookie.js';

export default class Session {

	static RegExp = {
		_id: /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/,
		lang: /^([a-z]+)-?/
	};
	static Clients = [];

	/**
	 * Searches for an already active session by the <session> cookie value.
	 *
	 * @param {String} cookie: The session cookie.
	 * @param {Stream} request: The HTTP request stream.
	 * @return {Session} Returns an existing or new session.
	 */
	static Find (cookie, request) {
		cookie = new Cookie('session', cookie).value;
		const session = Session.Clients.find(i => i.valueOf() === cookie) || new Session(cookie, request);
		return session.touch();
	};

	get [Symbol.toStringTag]() { return this._id.value; };
	valueOf () { return this._id.value; }

	/**
	 * Creates a session.
	 *
	 * @param {String} _id: A session ID to use as the cookie value.
	 * @param {Stream} request: The HTTP request stream.
	 * @return {Session}
	 */
	constructor (_id, request) {
		Session.Clients.push(this);
		this._id = new Cookie('session');
		this._id.set('httponly', true);
		this._id.set('secure', !!app.get('https'));
		this._id.set('samesite', 'strict');
		this._id.set(_id || randomUUID());
		if (request) {
			this.device = createHash('md5').update(request.headers['user-agent']).digest('hex');
			this.lang = (request.headers['accept-language'] || 'en').match(Session.RegExp.lang)[1];
		}
	};

	/**
	 * Resets the expiration on each session access.
	 *
	 * Default 15 min / 900000 ms, defined by <config.session.expires>
	 *
	 * @return {Session}
	 */
	touch () {
		const EXPIRES = app.get('session.expires') * 60 * 1000;
		(this._id.expires - new Date) > EXPIRES || this._id.set('expires', EXPIRES); /* :TODO: Don't reset the expiration if existing is longer */
		this.expires && this.expires.stop();
		Object.defineProperty(this, 'expires', {
			value: Date.setTimeout(() => Session.Clients.splice(Session.Clients.indexOf(this), 1), EXPIRES),
			configurable: true
		});
		return this;
	};

};
