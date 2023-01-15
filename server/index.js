import cluster			 from 'node:cluster';
import fs				 from 'node:fs/promises';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { cpus, tmpdir }	 from 'node:os';
import { dirname }		 from 'node:path';
import { fileURLToPath } from 'node:url';
import 'hekate/console.js';
import 'hekate/primitive/array.js';
import 'hekate/primitive/date.js';
import 'hekate/primitive/number.js';
import 'hekate/primitive/object.js';
import 'hekate/primitive/string.js';

export default global.app = new class Hekate {

	static RegExp = {
		error: /^([^\n]+)\n\s*at [\s\S]*?\((?:file:\/\/)?(.+?):(\d+):(\d+)\)/,
		esc: /\x1B\[\d+m/g,
		meta: /^(?:author|description|generator|keywords|referrer|theme-color|color-scheme|viewport|creator|googlebot|publisher|robots|viewport)$/,
		ws: /\s*,\s*/
	};

	/**
	 * Loads default configuration options from package.json and define readonly properties.
	 *
	 * @return {Hekate} Returns the Hekate class attached to the global.app variable.
	 */
	constructor () {
		const root = process.argv[1] + (existsSync(process.argv[1]) ? '' : '.js');
		this.core = fileURLToPath(dirname(import.meta.url)).slice(0, -7);
		this.root = lstatSync(root).isDirectory() ? root : dirname(root);
		this.logs = this.root + '/logs';
		this.page = this.root + '/content/pages';
		this.temp = tmpdir();
		this.package = JSON.parse(readFileSync(`${this.core}/package.json`, 'utf8'));
		this.package.config.deny.ip = [];
		this.package.config.deny.ua = [];
		Object.keys(this.package.config).map(i => this.set(i, this.package.config[i]));

		/**
		 * Sets a module function or file in preparation for loading.
		 *
		 * @param {Function|String} i: The name or value of the module.
		 * @return {Function|String} Returns the module function or file location.
		 */
		Object.defineProperty(this.module, 'get', { value: function get (i) {
			let file;
			return typeof i === 'function' ? (app.module[i] = i)
				 : app.module[i] ? app.module[i]
				 : existsSync(file = `${app.root}/content/modules/server/${i}/${i}.js`) ?  (app.module[i] = file)
				 : undefined;
		}});

		/**
		 * Triggers a module or its default method into memory as a stored value of the <app.module>
		 * object. If the module triggers an error, it's deleted and unavailable for use.
		 *
		 * @param {String} i: The name of the module.
		 * @param {Boolean} Returns true or false if an error triggers.
		 */
		Object.defineProperty(this.module, 'load', { value: async function load (i) {
			try {
				let load;
				app.module[i] || app.module.get(i);
				typeof app.module[i] === 'string' && (app.module[i] = await import(app.module[i]));
				if ((load = typeof app.module[i] === 'function' ? app.module[i] : app.module[i].default || null)) {
					await load();
					return true;
				} else throw Error;
			} catch (e) {
				delete app.module[i];
				app.error(e);
				app.error(new ReferenceError(`module.${i} not loaded`));
				return false;
			}
		}});

		/**
		 * Logs a message to a custom log file in logs/<file>.log with a leading RFC 3339 timestamp.
		 *
		 * @param {String} file: The name of the log file.
		 * @param {String|Number} ...i: A list of messages to print. If the last argument is
		 * 		Boolean:false, a timestamp will not be logged.
		 * @return {undefined}
		 */
		Object.defineProperty(this.log, 'to', { value: async function to (file, ...i) {
			try { await fs.access(`${app.logs}/${file}.log`); }
			catch (e) {
				const fh = await fs.open(`${app.logs}/${file}.log`, 'a');
				await fh.close();
			}
			try {
				if (i[i.length - 1] !== false) {
					i[0] instanceof Date || i.unshift(new Date());
					i[0] = console.font(i[0].toString('%c'), 35);
				} else {
					i.pop();
				}
				console[file === 'stderr' ? 'error' : 'log'](i = i.join(' '));
				await fs.appendFile(`${app.logs}/${file}.log`, i.replace(Hekate.RegExp.esc, '') + '\n');
			} catch (e) {
				console.error(e);
			}
		}});
	};

	/**
	 * Triggers an event with given parameters.
	 *
	 * If a handler method returns anything other than undefined, no additional parameters will be
	 * called. If one returns false, the emit function also returns false.
	 *
	 * @param {String} event: The name of the event to trigger.
	 * @param {*} ...data: Additional parameters used as data passed to the event handler.
	 * @return {*} Returns the value of the event handlers.
	 */
	async emit (event, ...data) {
		let emit;
		for await (const fn of (this.on[event] || [])) {
			emit = await fn(...data);
			fn.once && this.off(event, fn);
			if (emit === false) {
				return false;
			} else if (emit !== undefined) {
				break;
			}
		}
		return emit;
	};

	/**
	 * Processes error messages. If the error wasn't handled, exit the process.
	 *
	 * @param {Error} e: The error stack.
	 * @param {String} type: The error caller.
	 * @return {Boolean} Returns false.
	 */
	async error (e, type) {
		const time = new Date();
		e = (e = String(e.stack).match(Hekate.RegExp.error) || e).length === 5
			? `${console.font(e[1], 31)} at ` + // error
			  (e[2].indexOf(this.root) === 0
				  ? `${console.font(`file://${e[2].substring(0, this.root.length)}/`, 90)}${e[2].substring(this.root.length + 1)}`
				: `${console.font(`file://${e[2]}`, 90)}`) +
			  console.font(':', 90) + console.font(e[3], 33) + // line
			  console.font(':', 90) + console.font(e[4], 33) // column
			: e
		await this.log.to('stderr', e);
		type === 'unhandledRejection' && process.exit();
		return false;
	};

	/**
	 * Gets the value of a configuration setting.
	 *
	 * @param {String} key: A dot-notated string that is the setting name.
	 * @return {*} Returns the value of the setting if found. Returns undefined otherwise.
	 */
	get (key) {
		return this.set.walk(key);
	};

	/**
	 * Logs messages with a timestamp.
	 *
	 * If the first parameter is a {Date}, it will be used as the timestamp.
	 *
	 * @param {*} ...i: All arguments will be converted to strings before logging.
	 * @return {Boolean} Returns true.
	 */
	async log (...i) {
		return await this.log.to('stdout', ...i);
	};

	/**
	 * Adds meta data for use in page headers.
	 *
	 * @param {String} name: The name of the meta tag to use.
	 * @param {String} content: The meta data content.
	 * @return {*} If <content> is undefined, returns the content assigned to the name.
	 */
	meta (name, content) {
		if (content === undefined) {
			if (name === undefined) {
				content = [];
				for (const i in app.meta) {
					app.meta.hasOwnProperty(i) && content.push(i === 'title'
						? `<title>${app.meta.title.reverse().join(` ${app.get('title.separator')} `)}</title>`
						: app.meta(i)
					);
				}
				return content.join('\n');
			} else if ((content = app.meta[name] || '')) {
				return Hekate.RegExp.meta.test(name) ? `<meta name="${name}" content="${content}">`
					 : name === 'title' ? content
					 : '';
			}
		} else switch (name) {
			case 'title': {
				app.meta.title || (app.meta.title = []);
				app.meta.title.push(content);
				break;
			}
			default: app.meta[name] = content; break;
		}
		return '';
	};

	/**
	 * Prepare a module for loading.
	 *
	 * @param {Array|Function|String} name: A string will be split by commas and the resulting array
	 * 		defines each module to load. If it's a function, it is used as the [request] method and
	 * 		triggers on each page load.
	 * @return {undefined}
	 */
	module (name) {
		name = name instanceof Array ? name
			 : typeof name === 'string' ? name.split(Hekate.RegExp.ws)
			 : typeof name === 'function' ? [ name ]
			 : [];
		if (name.includes('get') || name.includes('load')) {
			app.error(new ReferenceError('Modules cannot be named "get" or "load"'));
		} else {
			name.map(this.module.get);
		}
	};

	/**
	 * Removes a handler method from an event.
	 *
	 * @param {String} event: The event name.
	 * @param {Function} fn: The handler method that would be used when an event triggers.
	 * @return {undefined}
	 */
	off (event, fn) {
		if (fn) {
			const evnt = this.on[event] || [];
			fn = typeof fn === 'function' ? fn : () => {};
			envt.includes(fn) && evnt.splice(evnt.indexOf(fn), 1);
		} else {
			delete this.on[event];
		}
	};

	/**
	 * Adds a handler method that will be called when an event is emitted.
	 *
	 * A "fn.once = true" key can be attached to the method to dictate that the handler be called
	 * only one time.
	 *
	 * @param {String} event: The event name.
	 * @param {Function} fn: The handler method that will be called on the event.
	 * @return {undefined}
	 */
	on (event, fn) {
		fn ||= () => {};
		(this.on[event] || (this.on[event] = [])).push(fn);
	};

	/**
	 * Adds a handler method that will be used once when an event is emitted.
	 *
	 * @param {String} event: The event name.
	 * @param {Function} fn: The handler method that will be called on the event.
	 * @return {undefined}
	 */
	once (event, fn) {
		fn ||= () => {};
		fn.once = true;
		(this.on[event] || (this.on[event] = [])).push(fn);
	};

	/**
	 * Saves a configuration setting.
	 *
	 * If the setting is already defined as an array, additional values will be pushed into the
	 * existing array.
	 *
	 * @param {String} key: A dot-notated string that is the setting name.
	 * @param {*} value: The value of the setting.
	 * @return {*} Returns the setting value.
	 */
	set (key, value) {
		const object = this.set.walk(key, true, true);
		key = key.split('.').pop();
		return value === undefined ? undefined : (object[key] =
			object[key] instanceof Array ? object[key].concat(value instanceof Array ? value : [ value ]).unique()
			: Object.prototype.toString.call(value) === '[object Object]'
				? Object.assign(typeof object[key] === 'object' ? object[key] : {}, value)
			: typeof value === 'boolean' ? new Boolean(value)
			: typeof value === 'number' ? new Number(value)
			: typeof value === 'string' ? new String(value)
			: value
		);
	};

	/**
	 * Starts child servers on cores as defined in app.get('clusters').
	 *
	 * @return {undefined}
	 */
	async start () {
		try { await import(`${this.root}/config.js`); } catch (e) {}
		try { await import(`${this.root}${app.get('template.directory')}/config.js`); } catch (e) {}
		cluster.isPrimary
			? new (await import('./primary.js')).default
			: new (await import('./server.js')).default
	};

};

process.env.TZ = 'UTC';
process.on('uncaughtException', app.error.bind(app));
process.on('SIGTERM', () => {
	const primary = cluster.worker.process;
	primary.kill(primary.pid, 'SIGKILL');
});
