/**
 * Displays a loading message.
 *
 * @param {String} text The text to display with animated (...).
 * @return {Promise} Returns the <setInterval> promise.
 */
export default function loading (text) {

	let x = 0;
	return Date.setInterval(() => {
		this.clear();
		process.stdout.write(`${console.font('UPDATE', 32)} ${text} ${'.'.repeat(x++).padEnd(3, ' ')}`);
		x &= 3;
	}, 250);

};