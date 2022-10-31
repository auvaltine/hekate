import stream from 'node:stream';
export default class Cookie {

	/**
	 * Gets a single or list of cookies.
	 *
	 * @param {String} cookie The name of the cookie to search for.
	 * @param {Stream} response The HTTP response stream, containing the "Set-Cookie" header.
	 * @return {Array|Cookie} Returns the list of or a single cookie object.
	 */
	static getCookie (cookie, response) {
		response = this instanceof stream ? this : cookie instanceof stream ? cookie : response;
		const cookies = (response.getHeader('Set-Cookie') || []).map(i => new Cookie(i));
		const i = cookie instanceof stream ? -1 : cookies.findIndex(i => i.name === cookie);
		return cookie ? (~i ? cookies[i] : []) : cookies;
	};

	/**
	 * Defines a cookie that will be sent with the response.
	 *
	 * @param {Cookie|String} cookie The cookie to set.
	 * @param {Stream} response The HTTP response stream, containing the "Set-Cookie" header.
	 * @return {String} Returns the "Set-Cookie" response header.
	 */
	static setCookie (cookie, response) {
		response = this instanceof stream ? this : cookie instanceof stream ? cookie : response;
		cookie instanceof Cookie || (cookie = new Cookie(cookie));
		const cookies = Cookie.getCookie(response);
		const i = cookie instanceof stream ? -1 : cookies.findIndex(i => i.name === cookie.name);
		~i ? (cookies[i] = cookie) : cookies.push(cookie);
		return response.setHeader('Set-Cookie', cookies.map(i => i.toString()));
	};

	/**
	 * Removes a cookie from the response.
	 *
	 * @param {String} cookie The name of the cookie to search for.
	 * @param {Stream} response The HTTP response stream, containing the "Set-Cookie" header.
	 * @return {undefined}
	 */
	static removeCookie (cookie, response) {
		response = this instanceof stream ? this : cookie instanceof stream ? cookie : response;
		const cookies = Cookie.getCookie(response);
		const i = cookie instanceof stream ? -1 : cookies.findIndex(i => i.name === cookie);
		if ((cookie = ~i ? cookies[i] : undefined)) {
			cookie.set('expires', -8.64e+7);
			Cookie.setCookie(response, cookie);
		}
	};

	expires = null;
	httponly = false;
	path = '/';
	samesite = 'Lax';
	secure = false;
	get [Symbol.toStringTag]() { return this.name; };

	/**
	 * Searches for a cookie, or creates a new cookie.
	 *
	 * @param {Object|String} name A key-value object defining the cookie properties, or a string
	 * 		that is the cookie name.
	 * @param {Stream} request The HTTP request stream.
	 * @return {Cookie} Returns the cookie properties.
	 */
	constructor (name, request) /* Search for a cookie, or create one */ {
		let cook;
		if (request !== undefined) {
			cook = typeof request === 'string' ? request : request.headers.cookie || '';
			if (~cook.indexOf('=')) {
				cook = cook.split(';').map(i => i.trim());
				cook = cook.find(i => i.split('=')[0] === name);
				cook = cook && decodeURIComponent(cook.substring(name.length + 1));
			} else {
				cook = decodeURIComponent(cook);
			}
			this.value = cook;
		} else if (typeof name === 'object') {
			cook = name[Object.keys(name)[0]];
			name = Object.keys(name)[0];
			Object.keys(cook).map(i => this.set(i, cook[i]));
		} else if (typeof name === 'string') {
			name = name.split(/\s*;\s*/);
			cook = name.slice(1).map(i => (i = i.split('=')) && this.set(i[0], i[1]));
			name = name[0].split('=');
			this.value = name[1];
			name = name[0];
		}
		Object.defineProperty(this, 'name', { value: name });
	};

	/**
	 * Sets the cookie properties.
	 *
	 * @param {String} key The name of the property to set.
	 * @param {Boolean|Date|String} value The property value.
	 * @return {Cookie} Returns the cookie.
	 */
	set (key, value) {
		switch (key = key.toLowerCase()) {
			case 'expires': {
				switch (typeof value) {
					case 'string': key = new Date(value); break;
					case 'number': key = new Date(); key.setMilliseconds(value); break;
					default: key = value; break;
				}
				this.expires = key;
				break;
			}
			case 'samesite': this[key] = value.toCapital(); break;
			case 'path': this[key] = value; break;
			case 'httponly':
			case 'secure': this[key] = Boolean(value); break;
			case 'value': key = value;
			default: typeof key === 'object' && value === undefined ? Object.assign(this, key) : (this.value = key); break;
		}
		return this;
	};

	/**
	 * Serializes the cookie to HTTP-header-safe format or returns the cookie value.
	 *
	 * @param {Boolean} value If true, returns the cookie value.
	 * @return {String} Returns the cookie value, or the serialized cookie string.
	 */
	toString (value) {
		return value
			? this.value
			: `${this.name}=${encodeURIComponent(this.value)}`
				+ (this.expires ? `; Expires=${this.expires.toUTCString()}` : '')
				+ (this.path ? `; Path=${this.path}` : '')
				+ (this.secure ? `; Secure` : '')
				+ (this.httponly ? `; HttpOnly` : '')
				+ (`; SameSite=${(this.samesite || 'Lax').toCapital()}`)
				+ (this.domain ? `; Domain=${this.domain}` : '');
	};

};
