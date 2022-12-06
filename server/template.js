import fs						   from 'node:fs/promises';
import { transformSync as minify } from '@babel/core';
import sass						   from 'sass';

export default class Template {
	
	static RegExp = {
		clientPrototype: /^(Hekate\.[\w]+ = )?Hekate\.prototype\.(\w+) = function/,
		remote: /^https?:\/\//,
		mini: /\.min\.js$/,
		tabs: /^(?:  )+/gm
	};

	static Files = Object.assign(new Map(), {

		/**
		 * Gets file stats and add its contents to the map.
		 *
		 * @param {String} name An identifier for the file.
		 * @param {String} path The file location.
		 * @return {Boolean|Object} Returns false if no file was found.
		 */
		async open (name, path) {
			path === undefined && (path = name);
			try {
				const file = await app.file(path);
				file.body = await fs.readFile(file.path);
				this.set(name, file);
				return file;
			} catch (e) {
				return false;
			}
		},

		/**
		 * Closes a file if it's part of the map and remove it.
		 *
		 * @param {String} name The file identifier.
		 * @return {undefined}
		 */
		async close (name) {
			this.has(name) && this.delete(name);
		}
	});

	/**
	 * Constructs a page with template literals.
	 *
	 * @param {Stream} response The HTTP response stream.
	 * @param {String} body A template string defining the page's body content.
	 * @param {String} Returns the parsed template.
	 */
	static async Build (response, body) {
		try {
			const html = [];
			let buff = {};
			for (const i of [
				body,
				(Template.Files.get('header') || { body: '\n' }).body,
				(Template.Files.get('footer') || { body: '\n' }).body
			]) {
				buff = await response.template(i, buff.args);
				html.push(buff?.body || '');
			}
			body = html[1] + html[0] + html[2];
		} catch (e) {
			app.error(e);
		}
		return body;
	};

	/**
	 * Watches for changes in the given directory and calls fn.change or fn.rename on an event.
	 *
	 * @param {String} dir The directory to watch.
	 * @param {Object} fn An object containing <.change> and <.rename> functions.
	 * @return {undefined}
	 */
	static Watch (dir, fn) {
		(async () => {
			for await (const event of await fs.watch(dir)) {
				const name = event.filename.substring(0, event.filename.lastIndexOf('.'));
				const path = `${dir}/${event.filename}`;
				fn[event.eventType] && await fn[event.eventType](name, path);
			}
		})();
	};

	/**
	 * Builds template files (HTML, CSS, and JavaScript).
	 *
	 * @param {Boolean} primary If running the primary app, <client.js> is rebuilt.
	 * @return {Template}
	 */
	constructor (primary) {
		return new Promise(async resolve => {
			if (primary) /* Build client.js on app start */ {
				await this.#client();
			} else /* Build template files on worker start */ {
				await this.#js();
				await this.#scss();
				await this.#html();
			}
			resolve();
		});
	};

	/**
	 * Compiles the client framework.
	 *
	 * @return {Template}
	 */
	async #client () {
		const node = `${app.root}${app.get('template.directory')}`;
		const date = new Date();
		  let code;
		try {
			const time = async node => {
				const tree = [];
				for await (let i of await fs.opendir(node)) {
					if (i.name[0] !== '.') {
						const item = `${node}/${i.name}`
						i = await fs.stat(item);
						i = i.isDirectory() ? await time(item) : [ i.mtime ];
						tree.push(...i);
					}
				}
				return tree;
			};
			// If any files part of client.js have changed since client.js was last compiled, throw
			// an error to trigger a remake.
			if ([ await time(`${app.core}/client`), await time(`${app.core}/server/primitive`) ].flat().sort((a, b) => b - a)[0] >
				 (await fs.stat(`${node}/client.js`)).mtime
			 ) {
				throw new Error;
			}
		} catch (e) {
			const year = new Date().toString('%Y');
			const head = [
				`/** Hekate.js`,
				`v${app.package.version} |`,
				`Copyright ${2022 < year ? `2022-${year}` : 2022}`,
				`${app.package.author.name} <${app.package.author.url}>`,
				`| ${app.package.license}`,
				`*/\n`
			].join(' ');
			code = (await fs.readFile(`${app.core}/client/index.js`, 'utf8')).split(/;\s+constructor /);
			code[2] = code[1];
			[ code[0], ...code[1] ] = code[0].split('\n');
			code[1] = code[1].join('\n');
			code.splice(1, 0, await (async () => /* Methods: core */ {
				const node = `${app.core}/client/core`;
				const tree = [];
				for await (let i of await fs.opendir(node)) {
					i.name[0] !== '.' && tree.push('\tstatic ' + (await fs.readFile(`${node}/${i.name}`, 'utf8'))
						.trim()
						.replace(/\n/g, '\n\t')
						.substring(7));
				}
				return tree.join('\n');
			})());
			code.push(await (async () => /* Methods: prototype */ {
				const node = `${app.core}/client/prototype`;
				const tree = [];
				for await (let i of await fs.opendir(node)) {
					i.name !== '.' && tree.push('\t' + (await fs.readFile(`${node}/${i.name}`, 'utf8')).trim()
						.replace(Template.RegExp.clientPrototype, (...i) => {
							i[1] && code.splice(2, 0, `\tstatic ${i[2]} = Hekate.prototype.${i[2]};`);
							return i[2];
						})
						.replace(/\n/g, '\n\t'));
				}
				return tree.join('\n');
			})());
			code.unshift(await (async () => /* Methods: primitive values */ {
				const node = `${app.core}/server/primitive`;
				const code = [];
				for await (let i of await fs.opendir(node)) {
					if (i.name[0] !== '.') {
						code.push((await fs.readFile(`${node}/${i.name}`, 'utf8')).trim());
					}
				}
				return code.join('\n');
			})());
			code.unshift('\'use strict\';\n');
			code[6] = '\tconstructor ' + code[6].trim().slice(0, -4);
			code.push('};');
			code = code.join('\n').replace(/\r/g, '\n').replace(/\n\n+/g, '\n')
					   .replace(/\bglobal\./g, 'window.');
			app.log('Rebuilding client.js...');
			await fs.writeFile(`${node}/client.js`, head + code);
			await fs.writeFile(`${node}/client.min.js`, head + minify(code, { comments: false, presets: [ 'minify' ] }).code);
			app.log(
				`Compiled: \x1b[35m${new Date() - date}ms\x1b[0m (` +
				`client.min.js: \x1b[33m${(await fs.stat(`${node}/client.min.js`)).size}\x1b[0m; ` +
				`client.js: \x1b[33m${(head + code).length}\x1b[0m)`
			);
		}
	};

	/**
	 * Compiles the SCSS stylesheet.
	 *
	 * @return {Template}
	 */
	async #scss () {
		const node = `${app.root}${app.get('template.directory')}`;
		const full = `${node}/style.css`;
		const thin = `${node}/style.min.css`;
		const make = async () => {
			try {
				const root = `${node}/scss/index.scss`;
				await fs.writeFile(full, sass.compile(root, { style: 'expanded' }).css.replace(Template.RegExp.tabs, i => '\t'.repeat(i.length / 2)));
				await fs.writeFile(thin, sass.compile(root, { style: 'compressed' }).css);
			} catch (e) { app.error(e); }
		};
		(await (async function scan (node) /* Get a list of directories to watch for changes */ {
			const dirs = [ node ];
			for await (const i of await fs.opendir(node)) {
				i.isDirectory() && dirs.push(...(await scan(`${node}/${i.name}`)));
			}
			return dirs;
		})(`${node}/scss`)).map(i => Template.Watch(i, { rename: make, change: make }));
		try {
			await fs.access(full);
			await fs.access(thin);
		} catch (e) {
			make();
		}
		await Template.Files.open('style', app.get('environment') == 'production' ? thin : full);
	};

	/**
	 * Compiles app scripts.
	 *
	 * @return {Template}
	 */
	async #js () {
		this.#js.tree = [];
		  let time = 0;
		const node = `${app.root}${app.get('template.directory')}/js`;
		const edge = `${node}/../script.min.js`;
		const code = [];
		try { time = (await fs.stat(edge)).mtime; } catch (e) {}
		for (let i of [
			...app.get('template.js').map(i => !Template.RegExp.remote.test(i)
				?   i[0] === '/' ? `${app.root}/${i.substring(1)}`
				  : i.substring(0, 8) === '@client/' && (i = i.split('/')) ? `${app.root}/content/modules/client/${i[1]}/${i[1]}.js`
				  : i
				: undefined).filter(Boolean),
			...(await fs.readdir(node)).map(i => i[0] !== '.' && `${node}/${i}`).filter(Boolean)
		]) {
			if (!Template.RegExp.mini.test(i) && (i = await app.file(i))) {
				this.#js.tree.push(i.path);
				time === true || (i.mtime > time && (time = true));
			}
		}
		if (time === true) {
			this.#js.tree.sort();
			for (let i of this.#js.tree) {
				code.push(await fs.readFile(i, 'utf8'));
			}
			await fs.writeFile(edge, minify(code.join('\n'), { comments: false, presets: [ 'minify' ] }).code);
		}
	};

	/**
	 * Loads template files.
	 *
	 * @return {Template}
	 */
	async #html () {
		  let load;
		const asst = app.get('template.directory');
		const node = `${app.root}${app.get('template.directory')}/html`;
		const mini = app.get('environment') == 'production';
		const chng = async (name, path) => {
			try {
				await fs.access(path);
				path = await Template.Files.open(name, path);
				load[name] && await load[name](path);
			} catch (e) {
				await Template.Files.close(name);
			}
		};
		await Promise.all((await fs.readdir(node)).map(async i => {
			const name = i.substring(0, i.lastIndexOf('.'));
			return await Template.Files.open(name, `${node}/${i}`);
		}));
		await Promise.all(Object.keys(load = {
			header: async (get = {}) => get.body = Buffer.from((get.body || '').toString('utf8')
				.replace(/<\/head>/, `<link rel="stylesheet" href="${asst}/style${app.get('environment') == 'production' ? '.min' : ''}.css">\n</head>`)
			),
			footer: async (get = {}) => get.body = Buffer.from((get.body || '').toString('utf8')
				.replace(/<\/body>/, [ `${asst}/client${mini ? '.min' : ''}.js` ]
						.concat(app.get('template.js').filter(i => Template.RegExp.remote.test(i)))
						.concat(mini
							? [ `${asst}/script.min.js` ]
							: app.get('environment') == 'development'
							? this.#js.tree.map(i => i.substring(app.root.length))
							: this.#js.tree.map(i => `${asst}/js/${i}`))
						.filter(Boolean)
						.map(i => `<script src="${i}"></script>`)
						.join('\n')
					+ '\n</body>')
			)
		}).map(async i => await load[i](Template.Files.get(i))));
		Template.Watch(node, { rename: chng, change: chng });
	};

};
