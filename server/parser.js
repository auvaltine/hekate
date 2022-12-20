import fs					 from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { randomUUID }		 from 'node:crypto';

export default class Parser {

	static Error = {
		ERR_MAX_TOTAL: 'Maximum upload size is %s bytes.',
		ERR_MAX_FILE: 'Maximum file size is %s bytes.'
	};
	static RegExp = {
		disposition: /^content-disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?$/i,
		form: /^(?:(multipart)\/form-data|application\/(?:x-www-form-)?(urlencoded|json))(?:; boundary=(.+))?/,
		sprintf: /%s/g,
		type: /^content-type: (.+?)$/i
	};
	static State = { INIT: 0, READING_HEADERS: 1, READING_PART_SEPARATOR: 2, READING_DATA: 3 };

	data = [];
	boundary = '';
	bytesRead = 0;
	buffer = [];
	headers = [];
	lastLine = '';
	state = Parser.State.INIT;
	post = { messages: [], status: true };

	/**
	 * Parses a POSTed HTTP request for its parts.
	 *
	 * @param {Stream} request: The HTTP request stream.
	 * @return {Parser}
	 */
	constructor (request) {
		const maxSize = app.get('upload.max');
		this.content = request.headers['content-type'].match(Parser.RegExp.form) || [,,'urlencoded',''];
		this.content = { type: this.content[1] || this.content[2], boundary: this.content[3] && ('--' + this.content[3]) };
		return new Promise(async (resolve, reject) => {
			const size = +request.headers['content-length'];
			try {
				if (maxSize && !isNaN(size) && size > maxSize) {
					throw new RangeError(Parser.Error.ERR_MAX_TOTAL.replace(Parser.RegExp.sprintf, maxSize));
				} else {
					request.on('data', async chunk => {
						try {
							const bytes = chunk.length;
							this.bytesRead += bytes;
							if (maxSize && this.bytesRead > maxSize) {
								throw new RangeError(Parser.Error.ERR_MAX_TOTAL.replace(Parser.RegExp.sprintf, maxSize));
							}
							this[this.content.type] && await this[this.content.type](chunk, bytes);
						} catch (e) { request.destroy(e); }
					});
				}
			} catch (e) { request.destroy(e); }
			request.on('end', () => resolve(this.serialize()));
			request.on('error', e => reject(e));
		}).catch(e => console.log(e.message));
	};

	/**
	 * Handles requests defined as "multipart".
	 *
	 * @param {Buffer} chunk: A chunked part of the request stream.
	 * @param {Number} bytes: The number of bytes in the chunk buffer.
	 * @return {Parser}
	 */
	async multipart (chunk, bytes) {
		for (let i = 0; i < bytes; i++) {
			const thisByte = chunk[i];
			const prevByte = i > 0 ? chunk[i - 1] : null;
			const newLine = thisByte === 0x0a && prevByte === 0x0d;
			if (!(thisByte === 0x0a || thisByte === 0x0d)) /* !CRLF */ {
				this.lastLine += String.fromCharCode(thisByte);
			}
			if (Parser.State.INIT === this.state && newLine) /* Start of field */ {
				if (this.content.boundary === this.lastLine) {
					this.state = Parser.State.READING_HEADERS;
				}
				this.lastLine = '';
			} else if (Parser.State.READING_HEADERS === this.state && newLine) /* Parse headers */ {
				if (this.lastLine.length) {
					this.headers instanceof Array && this.headers.push(this.lastLine);
				} else {
					this.headers = this.headers.map((h, i) =>
						((i = h.match(Parser.RegExp.disposition)) && i[1]) ||
						((i = h.match(Parser.RegExp.type)) && i[1])
					);
					this.headers = { name: this.headers[0], type: this.headers[1] };
					if (this.headers.type) {
						this.headers.file = [ app.temp, randomUUID() ].join('/');
						this.file = createWriteStream(this.headers.file);
					}
					this.buffer = [];
					this.state = Parser.State.READING_DATA;
				}
				this.lastLine = '';
			} else if (Parser.State.READING_DATA === this.state) /* Read field data */ {
				this.lastLine.length > this.content.boundary.length + 2 && (this.lastLine = '');
				if (this.content.boundary === this.lastLine) /* End of field */ {
					const input = { name: this.headers.name };
					if (this.headers.type) /* Add file to data list */ {
						const maxSize = app.get('upload.file');
						this.file.write(Buffer.from(this.buffer, 'binary'));
						input.size = this.file._writableState.length - this.lastLine.length - 1;
						input.type = this.headers.type;
						input.file = this.headers.file;
						if (maxSize && input.size > maxSize) {
							throw new RangeError(Parser.Error.ERR_MAX_FILE.replace(Parser.RegExp.sprintf, maxSize));
						}
						this.file.close(async () => await fs.truncate(input.file, input.size));
					} else /* Add variable to data list */ {
						input.data = Buffer.from(this.buffer.slice(0, this.buffer.length - this.lastLine.length - 1));
					}
					this.buffer = [];
					this.headers = [];
					this.lastLine = '';
					this.data.push(input);
					this.state = Parser.State.READING_PART_SEPARATOR;
				} else /* Read chunk */ {
					this.buffer.push(thisByte);
					if (this.headers.type && this.buffer.length >= 1e+6) /* Write 1MB chunks to temp file */ {
						this.file.write(Buffer.from(this.buffer, 'binary'));
						this.buffer = [];
					}
				}
				newLine && (this.lastLine = '');
			} else if (Parser.State.READING_PART_SEPARATOR === this.state) /* Found new field */ {
				newLine && (this.state = Parser.State.READING_HEADERS);
			}
		}
	};

	/**
	 * Handles requests defined as "application/json".
	 *
	 * @param {Buffer} chunk: A chunked part of the request stream.
	 * @param {Number} bytes: The number of bytes in the chunk buffer.
	 * @return {Parser}
	 */
	async json (chunk, bytes) { this.data.push(chunk); };

	/**
	 * Handles requests defined as "urlencoded" or default.
	 *
	 * @param {Buffer} chunk: A chunked part of the request stream.
	 * @param {Number} bytes: The number of bytes in the chunk buffer.
	 * @return {Parser}
	 */
	async urlencoded (chunk, bytes) { this.data.push(chunk); };

	/**
	 * Serializes the stream into its key-value parts. Files are given as their temporary file
	 * locations.
	 *
	 * @return {Object} Returns the POST object with its data parts.
	 */
	serialize () {
		const data = {};
		switch (this.content.type) {
			case 'json': {
				try {
					this.post.data = JSON.parse(this.data.toString('utf8'));
				} catch (e) {
					this.post.data = {};
				}
				return this.post;
			}
			case 'urlencoded': {
				this.data = decodeURI(this.data.toString('utf8')).split('&').map(i => {
					i = i.split('=');
					return { name: i[0], data: decodeURIComponent(i[1]) };
				});
				break;
			}
		}
		this.data.map(i => /* Serialize bracket keys into deep nest */ {
			const name = i.name.replace(/\]$/, '').split(/(?:\]\[|\[)/);
			let field = data;
			name.map((key, n) => {
				if (field !== undefined) {
					const arr = field instanceof Array;
					const value = name[n + 1] !== undefined
						? (!isNaN(+name[n + 1]) || !name[n + 1] ? [] : {})
						: i.type ? ({ type: i.type, file: i.file, size: i.size })
						: i.data.toString('utf8');
					key ? (field[key] === undefined ? (field[key] = value)
							: field[key] instanceof Array ? field[key].push(value)
							: undefined
						)
						: arr ? field.push(value)
						: undefined;
					field = key ? field[key] : arr ? field[-1] : undefined;
				}
			});
		});
		this.post.data = data;
		return this.post;
	};

};
