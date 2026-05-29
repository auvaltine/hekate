import sh from '../helpers/shell.mjs';

/**
 * Links the project directory to create the "hekate" module.
 *
 * @return {undefined}
 */
export default async function postinstall () {

	try {
		const path = this.root.substring(0, this.root.length - 5);
		await sh.exec(`ln -sfn '${path}' '${path}/node_modules/${this.opts.name}'`);
	} catch (e) {
		this.error(e);
	}

};
