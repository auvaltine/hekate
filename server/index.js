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

global.module = {};
export default global.app = new class Hekate {

	static RegExp = {
		error: /^([^\n]+)\n\s*at [\s\S]*?\((?:file:\/\/)?(.+?):(\d+):(\d+)\)/,
		esc: /\x1B\[\d+m/g,
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
		Object.defineProperty(this.module, 'get', { value: function get (i, file) {
			return module[i] ? module[i]
				 : existsSync(file = `${app.root}/content/modules/server/${i}/${i}.js`) ? (module[i] = file)
				 : undefined;
		}});
		Object.defineProperty(this.module, 'load', { value: async function load (i) {
			try {
				module[i] || this.get(i);
				typeof module[i] === 'string' && (module[i] = await import(module[i]));
				if (module[i].default) {
					if (await module[i].default()) {
						return true;
					}
				} else {
					return true;
				}
			} catch (e) {
				delete module[i];
				app.error(e);
				app.error(console.font(`ReferenceError: module.${i} not loaded`, 31));
			}
		}});
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
	 * Prepare a module for loading.
	 *
	 * @param {Array|Function|String} name: A string will be split by commas and the resulting array
	 * 		defines each module to load. If it's a function, it is used as the [request] method and
	 * 		triggers on each page load.
	 * @return {undefined}
	 */
	module (name) {
		if (typeof name === 'function') {
			module[name] = name;
		} else {
			name = name instanceof Array ? name : typeof name === 'string' ? name.split(Hekate.RegExp.ws) : [];
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
