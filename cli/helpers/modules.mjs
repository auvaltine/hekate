import fs from 'node:fs/promises';
import sh from './shell.mjs';
import regexp from '../constants/regexp.mjs';

/**
 * Gets a list of modules installed on each domain.
 *
 * @param {Array|String} host An array selects versions and dependencies of given modules from
 * 		the host. A string refers to the <./apps> directory containing hostnames.
 * @return {Array} Returns a list of modules with their name, path location, and version.
 */
export default async function modules (host) {

	let repo = [];
	try {
		if (host instanceof Array) {
			repo = JSON.parse((await sh.exec([
				`curl`,
				`-H "Content-Type: application/json"`,
				`-A "hekate/${this.opts.version}"`,
				`-d '${JSON.stringify(host.unique())}'`,
				`-sL ${this.opts.repository.url}/update`
			].join(' '))).stdout);
		} else {
			host = this.domain(host);
			for await (const app of await fs.opendir(host.path)) {
				if (app.isFile()) { continue; }
				if (app.name === 'content') /** found module directory */ {
					const dir = `${host.path}/${app.name}/modules`;
					await Promise.all(('client|server').split('|').map(async i => {
						if (!await this.file(`${dir}/${i}`)) return false;
						for await (const mod of await fs.opendir(`${dir}/${i}`)) {
							let path;
							if (
								(mod.isDirectory()) &&
								(await this.file(path = `${dir}/${i}/${mod.name}/${mod.name}.js`) ? mod : false)
							) {
								let head = (await sh.exec(`head -n 2 '${path}'`))
									.stdout.trim()
									.split('\n');
								head[0] = (head[0]?.match(regexp.fversion) || []).slice(1, 3);
								head[1] = (head[1]?.match(regexp.fdependencies) || [])[1]?.split(',');
								repo.push({
									name: head[0][0] || '@' + path.match(regexp.pathname)?.[1],
									version: head[0][1] || '0.0.0',
									dependencies: head[1],
									host: host
								});
							}
						}
					}));
				} else if (/^\d+$/.test(app.name)) /* go into port directory */ {
					repo.push(...await this.modules(`${host.path}/${app.name}`));
				}
			}
		}
	} catch (e) {
		this.error(e);
	}
	return repo;

};