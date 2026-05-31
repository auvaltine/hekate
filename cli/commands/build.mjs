import fs from 'node:fs/promises';

/**
 * Installs a domain to the ./apps directory.
 * Installs modules to a domain.
 *
 * 	- ./apps/[app-name]/assets/<html|js|scss>/
 * 	- ./apps/[app-name]/content/<l10n|pages|routes>/
 * 	- ./apps/[app-name]/content/modules/
 * 	- ./apps/[app-name]/logs/
 * 	- ./apps/[app-name]/<config.js|index.js|package.json>
 * 	- ./apps/[app-name]/assets/html/<footer.html|header.html>
 * 	- ./apps/[app-name]/assets/scss/<index.scss>
 * 	- ./apps/[app-name]/content/routes/<get.js|post.js>
 * 	- ./apps/[app-name]/logs/<stderr|stdout>.log
 *
 * @return {undefined}
 */
export default async function build () {

	  let done = false;
	const host = this.domain();
	try {
		let i;
		if (!await this.file(`${host.path}/index.js`)) {
			console.log(`${console.font('>', 32)} Installing ${console.font(`<${host.name}>`, 90)}\n`);
			await fs.mkdir(host.path, { recursive: true });
			i = `../..${host[1] !== 80 ? '/..' : ''}`;
			await this.scaffold([
				[ 'assets/' ],
				[ 'assets/html/' ],
				[ 'assets/js/' ],
				[ 'assets/scss/' ],
				[ 'content/' ],
				[ 'content/l10n/' ],
				[ 'content/modules/' ],
				[ 'content/pages/' ],
				[ 'content/routes/' ],
				[ 'logs/' ],
				[ 'config.js', [
					`app.set('domain', '${host.name}');`,
					`app.set('environment', 'development');`,
					`app.set('http.port', ${host[1]});`
				].join('\n') ],
				[ 'index.js', [
					`import 'hekate';`,
					`app.start();`
				].join('\n') ],
				[ 'package.json', JSON.stringify({
					type: "module",
					scripts: {
						update: `${i}/index.mjs update`,
						restart: `${i}/index.mjs restart`,
						start: `${i}/index.mjs start`,
						stop: `${i}/index.mjs stop`,
						build: `${i}/index.mjs build ${host.name}`
					}
				}, null, '\t') ],
				[ 'assets/html/footer.html', [
					`</body>`,
					`</html>`
				].join('\n') ],
				[ 'assets/html/header.html', [
					`<!DOCTYPE html>`,
					`<html>`,
					`<head></head>`,
					`<body>`
				].join('\n') ],
				[ 'assets/scss/index.scss' ],
				[ 'logs/stderr.log' ],
				[ 'logs/stdout.log' ],
				[ 'content/routes/get.js' ],
				[ 'content/routes/post.js' ]
			]);
			done = true;
		}
		const modules = process.argv.slice(4).filter(i => i[0] !== '-');
		if (modules.length) {
			done = false;
			const local = [];
			const remote = await this.modules(modules);
			for (const i in remote) {
				local.push({ name: i, host: host });
			}
			done = await this.download(local, remote);
		}
		if (done) {
			this.clear();
			console.log(`${console.font('SUCCESS', 32)} Use ${console.font(`npm start ${host.name}`, '35 -w')} to start the server`);
		} else throw new Error();
	} catch (e) {
		this.clear();
		this.error(e);
	}

};
