import { createHash, randomUUID } from 'node:crypto';
import stream from 'node:stream';
import Session from 'hekate/session';

export default class WebSocket {
	static Clients = [];

	/**
	 * Pings a client with a keep-alive packet.
	 *
	 * @param {Stream} socket: The client's socket to ping.
	 * @return {Promise} Returns a promise to end on the next ping.
	 */
	static Ping (socket) {
		socket._ping?.stop();
		return socket._ping = Date.setTimeout(() => WebSocket.Send('ping', socket), socket.server.requestTimeout / 1.5);
	};

	/**
	 * Sends a message to a client.
	 *
	 * @param {String} data: The data message to send.
	 * @param {Stream} sock: The client's socket to receive the message.
	 * @param {String|undefined} Returns the data message if it was successfully sent.
	 */
	static Send (data, sock) {
		data = data || '';
		if (
			(sock === undefined && (sock = WebSocket.Clients)).length ||
			(sock = (
				  sock instanceof stream.Duplex ? [ sock ] // A socket
				: sock instanceof Array ? sock.map(i => { // A combined array of sockets and socket IDs
					i = i instanceof stream.Duplex ? i._id : typeof i === 'string' ? i : undefined;
					return i && WebSocket.Clients.find(c => c._id === i);
				})
				: typeof sock === 'string' ? [ WebSocket.Clients.find(c => c._id === sock) ] // A single socket ID
				: []
			).filter(Boolean)).length
		) {
			let   text = Buffer.from(/^(?:ping|pong)$/.test(data) ? data : JSON.stringify(data));
			const size = text.length;
			const head = Buffer.alloc(size > 0xffff ? 10 : size > 125 ? 4 : 2);
			head[0] = 0x81;
			if (size > 0xffff) /* Packet headers */ {
				head[1] = 127;
				head[2] = (size >> 56) & 0xff;
				head[3] = (size >> 48) & 0xff;
				head[4] = (size >> 40) & 0xff;
				head[5] = (size >> 32) & 0xff;
				head[6] = (size >> 24) & 0xff;
				head[7] = (size >> 16) & 0xff;
				head[8] = (size >> 8) & 0xff;
				head[9] = size & 0xff;
			} else if (size > 125) /* New packet */ {
				head[1] = 126;
				head[2] = (size >> 8) & 0xff;
				head[3] = size & 0xff;
			} else {
				head[1] = size;
			}
			text = Buffer.concat([ head, text ], head.length + size);
			sock.map(i => i.write(text, 'binary'));
			return data;
		}
	};

	/**
	 * Creates a WebSocket listener.
	 *
	 * @param {Stream} request: The HTTP request stream.
	 * @param {Stream} socket: The client's socket stream.
	 * @return {WebSocket}
	 */
	constructor (request, socket) {
		const headers = [
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: websocket',
			'Connection: Upgrade',
			'Sec-WebSocket-Accept: ' + createHash('sha1')
				.update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
				.digest('base64')
		];
		socket.write(headers.join('\r\n') + '\r\n\r\n');
		this.socket = WebSocket.Clients[WebSocket.Clients.push(socket) - 1];
		this.socket._id = randomUUID();
		this.socket.session = Session.Find(request.headers.cookie || '', request);
		this.socket.on('data', this.message.bind({ socket: this.socket, payload: this.payload }));
		this.socket.on('error', e => app.log(e));
		this.socket.on('close', i => {
			this.socket._ping?.stop();
			~(i = WebSocket.Clients.indexOf(this.socket)) && WebSocket.Clients.splice(i, 1);
		});
		WebSocket.Ping(this.socket);
		app.emit('socket.connect', this.socket, request);
	};

	/**
	 * Parses a message received from the client.
	 *
	 * When the message is fully constructed, it's passed as a payload to an HTTP verb event defined on <app.socket>.
	 *
	 * @param {Buffer} data: A data packet to parse.
	 * @return {WebSocket}
	 */
	async message (data) {
		const opcode = data[0] & 0x0f;
		if (
			 (opcode === 0x8) || // connection close
			!(data[1] & 0x80) || // mask undefined
			 (data[0] & 0x40) || // RSV1 not supported
			 (data[0] & 0x20) || // RSV2 not supported
			 (data[0] & 0x10)	 // RSV3 not supported
		) /* death becomes her */ {
			return this.socket.destroy();
		} else switch (opcode) {
			case 0x1: this.payload = ''; // begin text
			case 0x2: this.payload = ''; // begin binary
			case 0x0: { // continue
				let size = data[1] & 0x7f;
				let byte = 2;
				if (size === 126) {
					size = data.readUInt16BE(byte);
					byte += 2;
				} else if (size === 127) {
					if (data.readUInt32BE(byte)) {
						return this.socket.destroy();
					}
					size = data.readUInt32BE(byte + 4);
					byte += 8;
				}
				const mask = data.slice(byte, byte + 4);
				byte += 4;
				this.payload += data.slice(byte, byte + size).map((i, k) => i ^ mask[k % 4]);
				break;
			}
			case 0x9: return; // ping undefined
			case 0xa: return; // pong undefined
			default:  return; // 0x3-0x7 0xb-0xf reserved
		}
		if (data[0] & 0x80) switch (this.payload) { // FIN
			case 'ping': return;
			case 'pong': return WebSocket.Ping(this.socket); // client heartbeat
			default: {
				try { this.payload = JSON.parse(this.payload); }
				catch (e) { this.payload = { type: this.payload }; }
				const fns = (app.on['http.socket'] || []).filter(i => i.match.test(this.payload.event));
				for (const i of fns) {
					const emit = await i.call(this.socket, this.payload.event, this.payload.data);
					if (emit === false) {
						break;
					}
				}
			}
		}
	};

};
