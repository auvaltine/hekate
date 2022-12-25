Hekate.socket = (() => {
	class Socket {
		events = [];
		instance = 0;
		constructor (url, opts = {}) {
			url = typeof url === 'string' && url ? url : '/';
			url = new URL((url[0] === '/' ? `http${location.protocol === 'https:' ? 's' : ''}://${location.host}` : '') + url);
			this.socket = new WebSocket(`ws${url.protocol === 'https:' ? 's' : ''}://${url.host}${url.pathname}`);
			this.socket.onmessage = this.onmessage.bind(this);
			this.socket.onopen = this.onopen.bind(this);
		};
		onmessage (event, data) {
			switch (data = event.data) {
				case 'ping': return this.socket.send('pong'); // server heartbeat
				case 'pong': return;
				default: {
					data = JSON.parse(data);
					this.events
						.filter(i => i.event === data.event || i.event + '.' === data.event.substring(0, i.event.length + 1))
						.map(i => i.fn.call(this, data.event, data.data));
					break;
				}
			}
		};
		onopen () { this.onmessage({ data: JSON.stringify({ event: 'open' }) }); };
		on (event, fn) { this.events.push({ event, fn }); };
		send (event, data) { this.socket.send(JSON.stringify({ event, data })); };
	};
	return url => new Socket(url);
})();
