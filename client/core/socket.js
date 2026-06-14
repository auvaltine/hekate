Hekate.socket = (() => {
	class Socket {
		events = [];
		instance = 0;
		constructor (url) {
			url = typeof url === 'string' && url ? url : '/';
			url = new URL((url[0] === '/' ? `http${location.protocol === 'https:' ? 's' : ''}://${location.host}` : '') + url);
			const protocol = url.protocol === 'wss:' || url.protocol === 'https:' ? 'wss' : 'ws';
			this.socket = new WebSocket(`${protocol}://${url.host}${url.pathname}${url.search}`);
			this.socket.onmessage = this.onmessage.bind(this);
			this.socket.onopen = this.onopen.bind(this);
			this.socket.onerror = this.onerror.bind(this);
			this.socket.onclose = this.onclose.bind(this);
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
		onerror (event) { this.onmessage({ data: JSON.stringify({ event: 'error', data: { type: event.type } }) }); };
		onclose (event) { this.onmessage({ data: JSON.stringify({ event: 'close', data: { code: event.code, reason: event.reason, wasClean: event.wasClean } }) }); };
		on (event, fn) { this.events.push({ event, fn }); };
		send (event, data) { this.socket.send(JSON.stringify({ event, data })); };
	};
	return url => new Socket(url);
})();
