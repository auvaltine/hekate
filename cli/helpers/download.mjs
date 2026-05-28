import sh from './shell.mjs';

/**
 * Downloads module files from the source to local domain installations.
 *
 * @param {Array} local A list of local module {Object} installations.
 * 		- name: Name of the module, prefixed with <@>.
 * 		- path: Directory where the module is installed.
 * 		- host: The domain where the module is installed.
 * @param {Object} remote A list of modules from the source with version and all dependencies.
 * 		- version: Semver-compliant version number of the source module.
 * 		- request: All files needed for the module.
 * @return {Boolean|Error} Returns true if successful, an error message on any failure.
 */
export default async function download (local, remote) {

	const dirs = [];
	download: for (const i of local.filter(Boolean)) {
		const dirs = [];
		console.log(`${console.font(`<${i.host.name}>`, 90)} ${i.name}`);
		for (const r of remote[i.name].request) {
			const name = r.split('/').slice(0, 2).join('/');
			const file = r.split('/').slice(2).join('/');
			const path = `${i.host.path}/content/modules/${name}`;
			if (!dirs.includes(path)) {
				dirs.push(path);
				await sh.exec(`rm -rf '${path}/*'`);
			}
			this.clear();
			process.stdout.write([
				console.font('MODULE', 32),
				console.font(`<${i.host[1] === 80 ? i.host[0] : i.host.join(':')}>`, 90),
				`${name}/${file}`
			].join(' '));
			try {
				await sh.exec([
					`curl`,
					`-A hekate/${this.opts.version}`,
					`-o '${path}/${file}'`,
					`--create-dirs`,
					`-sL '${this.opts.repository.url}/update/${name}/${file}'`
				].join(' '));
			} catch (e) {
				this.error(e);
			}
		}
	}
	return true;

};