import sh from './shell.mjs';

/**
 * Checks for server process IDs matching the app directory.
 *
 * @return {Array} Returns process IDs, or an empty array if none are found.
 */
export default async function pids () {

	try {
		const path = this.domain().path;
		const rels = path.substring(this.root.substring(0, this.root.length - 5).length + 1);
		return (await sh.exec('ps -eo pid=,args=')).stdout
			.trim()
			.split('\n')
			.map(i => i.trim().match(/^(\d+)\s+(.+)$/))
			.filter(Boolean)
			.filter(i =>
				/(^|\s)(?:\S*\/)?node(?:\s|$)/.test(i[2]) &&
				(i[2].includes(path) || i[2].includes(rels))
			)
			.map(i => +i[1]);
	} catch (e) {
		return [];
	}

};
