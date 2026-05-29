import readline from 'node:readline';
import regexp from '../constants/regexp.mjs';

/**
 * Prompts (Yes/No) user input.
 *
 * @param {String} i The name of the prompt to display.
 * @return {Promise} Returns a promise that contains the yes or no choice as a {Boolean}.
 */
export default async function prompt (i) {

	switch (i) {
		case 'install': {
			console.log(console.font('ERROR', 31), `${console.font(`<${this.domain().name}>`, 90)} doesn't exist`);
			await this.prompt(`${console.font('ERROR', 31)} Do you want to create this domain now?`)
				? console.log() || await this.run.build()
				: console.log(console.font('ERROR', 31), 'Leaving in peace...');
			break;
		}
		default: return new Promise(resolve => {
			switch (process.argv[process.argv.length - 1]) {
				case '-y': resolve(true); break;
				case '-n': resolve(false); break;
				default: {
						let need = false;
					const wait = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
						prompt: `${(i ? `${i} ` : '')}(${console.font('Y', '-s')}es/${console.font('N', '-s')}o): `
					});
					wait.prompt();
					wait.on('line', line => {
						switch ((line.trim().match(regexp.prompt)?.[0]?.[0] || '').toLowerCase()) {
							case 'y': need = true; return wait.close();
							case 'n': need = false; return wait.close();
						}
						wait.prompt();
					});
					wait.on('close', () => resolve(need));
				}
			}
		});
	}

};
