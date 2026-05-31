/**
 * Loads one or more URLs, optionally inserting HTML/SVG/XML into the selected element.
 *
 * @param {String|String[]|Object|Function} opts
 * @param {String|String[]} opts.url - URL or ordered list of URLs to request.
 * @param {String|String[]} [opts.urls] - Alias for opts.url.
 * @param {String} [opts.method=get]
 * @param {Object|FormData|String} [opts.params]
 * @param {Object} [opts.headers]
 * @param {Number} [opts.timeout=0]
 * @param {String} [opts.position=insert] - insert, append, before, prepend, replace, or wrap.
 * @param {Function} [opts.before] - Called before requests start: before(opts).
 * @param {Function} [opts.each] - Called after each response: each(xhr, response, url).
 * @param {Function} [opts.progress] - Called after each response: progress(loaded, total, response, url).
 * @param {Function} [opts.complete] - Called after all responses: complete(response|responses).
 * @param {Function} [opts.error] - Called on request failure/timeout: error(type, xhr).
 * @param {Function} [fn] - Alias for opts.complete.
 * @return {Hekate}
 */
Hekate.ajax = Hekate.prototype.ajax = function (opts, fn) {
	const trim = str => str.replace(/(<(pre|script|style|textarea)[^]+?<\/\2)|(^|>)\s+|\s+(?=<|$)/g, "$1$3").replace(/<!--.*?-->/g, '');
	const host = `${window.location.protocol}//${window.location.host}`;
	opts = typeof opts === 'function' ? { complete: opts }
		 : typeof opts === 'string' ? { url: [ opts ] }
		 : opts instanceof Array ? { url: opts }
		 : opts;
	opts = Object.assign({
		headers: { 'Accept': '*/*' },
		method: 'get',
		params: {},
		timeout: 0,
		position: 'insert', // append / before / prepend / replace / wrap / insert
		each: Hekate.noop,
		error: Hekate.noop,
		before: Hekate.noop,
		complete: typeof fn === 'function' ? fn : Hekate.noop,
		progress: Hekate.noop
	}, opts);
	opts.headers['X-Requested-With'] = 'XMLHttpRequest';
	opts.method = opts.method.toLowerCase();
	opts.url === undefined && opts.urls !== undefined && (opts.url = opts.urls);
	opts.url = (typeof opts.url === 'string' ? [ opts.url ] : opts.url instanceof Array ? opts.url : [ null ]);
	return (this instanceof Hekate ? this : new Hekate(window)).each(function () {
		const elem = new Hekate(this);
		let loaded = 0;
		const responses = [];
		const finish = (response, url, index) => {
			responses[index] = response;
			opts.progress.call(this, ++loaded, opts.url.length, response, url);
			if (loaded === opts.url.length) {
				opts.complete.call(this, opts.url.length === 1 ? response : responses);
				elem.emit('ajax.complete', { response: opts.url.length === 1 ? response : responses, url });
			}
		};
		opts.before.call(this, opts);
		opts.url.map((i, index) => {
			const find = (i === null ? this.action || this.href || window.location.href : i).match(/([^\s]+)(?:\s+(.+))?/);
			let href = find[1];
			let file = (href.match(/\.(css|js)$/) || [])[1];
			if (file) {
				if (file === 'css') {
					file = !Array.from(document.styleSheets).some(a => a.href === href)
						? new Hekate(document.createElement('link')).attr('rel', 'stylesheet').attr('href', href)
						: null;
				} else if (!Array.from(document.scripts).some(a => a.src === href)) {
					file = new Hekate(document.createElement('script')).attr('src', href);
					if (href.substring(0, host.length !== host)) {
						const fn = Hekate.nonce();
						window[fn] = json => opts.complete();
						file.attr('src', href.replace('=?', '=' + fn));
					}
				} else {
					file = null;
				}
				if (file) {
					(elem[0] === window ? new Hekate('body') : elem).html(file, 'append');
					file.on('load', () => {
						opts.each.call(this, file[0]);
						finish(file[0], href, index);
					});
				}
				return;
			} else if (elem.is('form')) {
				opts.method = this.method;
				opts.params = Hekate.serialize(this);
			}
			const xhr = new XMLHttpRequest();
			xhr.open(opts.method, href);
			opts.method === 'post' && opts.params instanceof Object && (opts.headers['Content-Type'] = 'application/json;charset=utf8');
			for (let h in opts.headers) {
				opts.headers.hasOwnProperty(h) && xhr.setRequestHeader(h, opts.headers[h]);
			}
			xhr.timeout = opts.timeout;
			xhr.onerror = () => opts.error.call(this, 'error', xhr);
			xhr.ontimeout = () => opts.error.call(this, 'timeout', xhr);
			xhr.onload = () => {
				const type = ((xhr.getResponseHeader('Content-Type') || 'text/html').match(/^[^\/]+\/([^ +;]+)/) || [])[1];
				let text = xhr.responseText.trim();
				switch (type) {
					case 'json': { text = JSON.parse(text || '[]'); break; }
					case 'html':
					case 'svg':
					case 'xml': {
						text = new Hekate(text, type === 'html' ? undefined : type);
						find[2] && (text = text.filter(find[2]));
						elem[0] !== window && elem.html(text, opts.position);
						break;
					}
				}
				elem.emit('ajax', { response: text, url: href });
				opts.each.call(this, xhr, text, i);
				finish(text, href, index);
			};
			xhr.send(opts.method === 'post' ? (
				  opts.params instanceof FormData ? opts.params
				: opts.params instanceof Object ? JSON.stringify(opts.params)
				: opts.params)
				: null);
		});
	});
};
