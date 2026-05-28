import sh from './shell.mjs';

/**
 * Checks for the server's process ID.
 *
 * @return {Number} Returns the process ID, or <0> if none found.
 */
export default async function pid () {

	try {
		const find = `'node ${this.domain().path}'`;
		return +((await sh.exec(`ps aux | grep ${find}`)).stdout
			.trim()
			.split('\n')
			.filter(i => find === `'${i.split(/\s+/).slice(10).join(' ')}'`)?.[0]
			.split(/\s+/)[1] || 0);
	} catch (e) {
		return 0;
	}

};