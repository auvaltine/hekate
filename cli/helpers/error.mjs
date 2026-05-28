/**
 * Prints a fatal error message and exits.
 *
 * @param {String|Error} error The error full stack, or type of error.
 * @param {String} text The error message.
 * @return {undefined}
 */
export default function error (error, text) {

	this.clear();
	if (error.stack) {
		const e = error.stack.match(/^(.+): ([^\n]+)\n/) || [];
		text  = error.stderr || e[2];
		error = e[1]?.match(/([^:]+)$/)[1].trim();
	}
	console.log(console.font('ERROR', 31), `${error}:`, console.font(text, 31));
	process.exit(1);

};