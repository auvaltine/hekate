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
	opts.url = (typeof opts.url === 'string' ? [ opts.url ] : opts.url instanceof Array ? opts.url : [ null ]);
	return (this instanceof Hekate ? this : new Hekate(window)).each(function () {
		const elem = new Hekate(this);
		let loaded = 0;
		opts.url.map(i => {
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
					elem[0] !== window && elem.html(file, 'append');
					file.on('load', () => ++loaded === opts.url.length && opts.complete.call(this));
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
					case 'svg':
					case 'xml': { text = new Hekate(text, type); opts.position && elem.html(text, opts.position); break; }
					case 'html': { find[2] && (text = new Hekate(text).filter(find[2])) && elem[0] !== window && elem.html(text); break; }
				}
				elem.emit('ajax', { response: text, url: href });
				opts.each.call(this, xhr, i);
				if (++loaded === opts.url.length) {
					opts.complete.call(this, text);
					elem.emit('ajax.complete', { response: text, url: href });
				}
			};
			xhr.send(opts.method === 'post' ? (
				  opts.params instanceof FormData ? opts.params
				: opts.params instanceof Object ? JSON.stringify(opts.params)
				: opts.params)
				: null);
		});
	});
};
