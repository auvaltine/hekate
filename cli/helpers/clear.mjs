/**
 * Clears the output to write over it.
 *
 * @return {undefined}
 */
export default function clear () {

	if (process.stdout.isTTY) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
	}

};