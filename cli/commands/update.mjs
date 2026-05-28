import fs from 'node:fs/promises';
import sh from '../helpers/shell.mjs';

/**
 * Updates all installations.
 *
 * A query is run to https://hekate.app/r/update/@core,<...modules>, where <...modules> is
 * a list of all modules in all domains. A JSON object is returned containing the latest
 * version of Hekate.js (@core) and all requested modules.
 *
 * If any installed modules are determined to be incompatible with newer versions (i.e.,
 * major version numbers are different), warnings are printed and the option to continue or
 * ignore specific updates is allowed.
 *
 * After @core and module update, `npm update` is run, which updates dependencies.
 *
 * @return {undefined}
 */
export default async function update () {

	  let load;
	  let errs = false;
	const mods = [];
	const repo = [{ name: '@core', path: this.root, version: this.opts.version }];
	const tree = await (async () => {
		try { for await (let i of await fs.opendir(this.root)) {
			i.isDirectory() && repo.push(...await this.modules(`${this.root}/${i.name}`));
		}} catch (e) {}
		return this.modules(repo.map(i => i.name));
	})();
	const done = async () => {
		await this.run.postinstall();
		console.log(console.font('UPDATE', 32), 'Didn\'t run into any problems. See ya!');
		process.exit();
	};

	console.log(console.font('WARNING', 33), 'If any of your local installations are incompatible with the latest');
	console.log(console.font('WARNING', 33), '(remote) version, you can choose to update these, or skip them.');
	console.log();
	await this.version(repo[0], tree['@core']);
	for (const i of repo.slice(1)) {
		let updt = tree[i.name];
		updt && updt.version !== i.version && mods.push(await this.version(i, updt));
	}
	console.log();

	// Update modules...
	await this.download(mods, tree);

	// Update Hekate.js...
	if (repo[0].version !== tree['@core'].version) {
		load = this.loading(console.font('<hekate.js>', 90));
		try { await sh.exec('git pull'); }
		catch (e) { this.error(e); }
		load.end();
	}

	// Update Hekate.js node_modules...
	if (await this.prompt(`${console.font('UPDATE', 32)} Do you want to update @core modules?`)) {
		this.clear();
		load = this.loading(console.font('<hekate.js/node_modules>', 90));
		sh.spawn('npm', [ 'update' ], { cwd: this.root }).on('close', async () => {
			load.end();
			this.clear();
			console.log(console.font('UPDATE', 32), console.font('<hekate.js/node_modules>', 90));
			await done();
		}).stderr.on('data', i => this.error(i));
	} else await done();

};