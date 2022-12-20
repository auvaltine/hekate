import fs						   from 'node:fs/promises';
import { transformSync as minify } from '@babel/core';
import sass						   from 'sass';

export default class Template {
	
	static RegExp = {
		clientPrototype: /^(Hekate\.[\w]+ = )?Hekate\.prototype\.(\w+) = function/,
		html: /(?:^|\/)[^\.][^\/]*\.html$/i,
		remote: /^https?:\/\//,
		mini: /\.min\.js$/
	};

	static Files = Object.assign(new Map(), {

		/**
		 * Gets file stats and add its contents to the map.
		 *
		 * @param {String} path: The file location.
		 * @return {Boolean|Object} Returns false if no file was found.
		 */
		async open (path) {
			try {
				  let fn   = Template.On.open?.[path] || (() => {});
				const file = await app.file(path);
				const body = await fs.readFile(file.path);
				fn = fn(body);
				file.body = fn === undefined ? body : fn;
				file.body = file.body instanceof Buffer ? file.body : typeof file.body === 'string' ? Buffer.from(file.body) : '';
				this.set(file.path, file);
				return file;
			} catch (e) {
				return app.error(e);
			}
		},

		/**
		 * Closes a file if it's part of the map and remove it.
		 *
		 * @param {String} path: The file identifier.
		 * @return {undefined}
		 */
		async close (path) {
			this.has(path) && this.delete(path);
		}
	});

	/**
	 * Constructs a page with template literals.
	 *
	 * @param {Stream} response: The HTTP response stream.
	 * @param {String} body: A template string defining the page's body content.
	 * @return {String} Returns the parsed template.
	 */
	static async Build (response, body) {
		try {
			const html = [];
			const file = `${app.root}${app.get('template.directory')}/html`;
			let buff = {};
			for (const i of [
				body,
				(Template.Files.get(`${file}/header.html`) || { body: '\n' }).body,
				(Template.Files.get(`${file}/footer.html`) || { body: '\n' }).body
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
	 * Assigns an event listener to a file location.
	 *
	 * @param {String} event: The name of the event (e.g., open).
	 * @param {String} path: The file location.
	 * @param {Function} fn: A function to call when the event triggers.
	 * 		@param {Buffer} data: The buffer contents of the file.
	 * 		@return {Buffer|String|undefined} The return value that will be assigned to the file.
	 * 			If the value is a string, it will be converted to a buffer. If it is undefined, the
	 * 			original buffer value is used.
	 * @return {undefined}
	 */
	static On (event, path, fn) {
		Template.On[event] || (Template.On[event] = {});
		Template.On[event][path] = fn;
	};

	/**
	 * Watches for changes in the given directory and calls fn.change or fn.rename on an event.
	 *
	 * @param {String} dir: The directory to watch.
	 * @param {Object} fn: An object containing <.change> and <.rename> functions.
	 * @return {undefined}
	 */
	static async Watch (dir, fn) {
		let i;
		if ((await fs.stat(dir)).isDirectory()) {
			for await (const i of await fs.watch(dir)) {
				if (fn[i.eventType]) try {
					await fs.access(`${dir}/${i.filename}`);
					await fn[i.eventType](`${dir}/${i.filename}`);
				} catch (e) {}
			}
		} else {
			for await (const i of await fs.watch(dir)) {
				if (fn[i.eventType]) try {
					await fs.access(dir);
					await fn[i.eventType](dir);
					await Template.Watch(dir, fn);
				} catch (e) {}
			}
		}
	};

	/**
	 * Builds template files (HTML, CSS, and JavaScript).
	 *
	 * @param {Boolean} primary: If running the primary app, <client.js> is rebuilt.
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
		const root = `${app.root}${app.get('template.directory')}`;
		const full = `${root}/style.css`;
		const thin = `${root}/style.min.css`;
		const make = async () => {
			try {
				const scss = (await fs.readFile(`${root}/scss/index.scss`)) + (await Promise.all(app.get('template.css')
					.filter(i => i[0] === '/')
					.map(async i => {
						try {
							await fs.access(`${app.root}${i}`);
							return `@import '${app.root}${i}';`;
						} catch (e) {}
					})))
					.join('\n');
				for (const i of [ 'compressed', 'expanded' ]) {
					await new Promise(resolve => sass.render({
						data: scss,
						includePaths: [ root + '/scss' ],
						indentType: 'tab',
						indentWidth: 1,
						outputStyle: i
					}, async (e, result) => resolve(e ? app.error(e) : await fs.writeFile(i === 'expanded' ? full : thin, result.css))));
				}
			} catch (e) { app.error(e); }
		};
		(await (async function scan (node) /* Get a list of directories to watch for changes */ {
			const dirs = [];
			for (let i of node instanceof Array ? node : [ node ]) {
				if (i[0] === '/') try {
					await fs.access(i = `${app.root}${i}`);
					const path = await fs.stat(i);
					dirs.push(i);
					if (path.isDirectory()) {
						for await (const file of await fs.opendir(i)) {
							file.isDirectory() && dirs.push(...(await scan(`${i}/${file.name}`)));
						}
					}
				} catch (e) {}
			}
			return dirs;
		})([ `${app.get('template.directory')}/scss` ].concat(app.get('template.css').filter(i => i[0] === '/'))))
			.map(i => Template.Watch(i, { rename: make, change: make }));
		await make();
		await Template.Files.open(app.get('environment') == 'production' ? thin : full);
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
		const prod = app.get('environment') == 'production';
		const devl = app.get('environment') == 'development';
		const root = await fs.opendir(`${app.root}${asst}/html`);
		const make = async path => {
			try {
				if (!Template.RegExp.html.test(path)) { throw new TypeError('File must be .html'); }
				await fs.access(path);
				await Template.Files.open(path);
			} catch (e) {
				app.error(e);
				await Template.Files.close(path);
			}
		};
		Template.On('open', `${root.path}/header.html`, data => {
			const link = `<link rel="stylesheet" href="${asst}/style${prod ? '.min' : ''}.css">`;
			return data.toString().replace(/<\/head>/, `\n${link}\n</head>`);
		});
		Template.On('open', `${root.path}/footer.html`, data => {
			const scrp = [ `${asst}/client${prod ? '.min' : ''}.js` ]
				.concat(app.get('template.js').filter(i => Template.RegExp.remote.test(i)))
				.concat(prod ? [ `${asst}/script.min.js` ] : this.#js.tree.map(i => devl ? i.substring(app.root.length) : `${asst}/js/${i}`))
				.filter(Boolean);
			return data.toString().replace(/<\/body>/, scrp.map(i => `<script src="${i}"></script>`).join('\n') + '\n</body>');
		});
		Template.Watch(root.path, { rename: make, change: make });
		for await (let i of root) { await make(`${root.path}/${i.name}`); }
	};

};
