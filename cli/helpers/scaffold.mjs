import fs from 'node:fs/promises';

/**
 * Builds from a list of directories or files and outputs the result.
 *
 * @param {Array} list The list of items to create.
 * @return {Boolean|Error} Returns false if all were successful, or an error stack.
 */
export default async function scaffold (list) {

	const host = this.domain();
	for await (const i of list) {
		this.clear();
		const name = [ host.path, i[0] ].join('/');
		const text = i[1] || '';
		if (await this.file(name)) {
			process.stdout.write(`${console.font('EXISTS', 33)} ${name}`);
		} else try {
			name.slice(-1) === '/' ? await fs.mkdir(name) : await fs.writeFile(name, text + '\n');
			process.stdout.write(`${console.font('CREATE', 32)} ${name}`)
		} catch (e) {
			this.error(e);
		}
		await Date.setTimeout(25);
	}

};