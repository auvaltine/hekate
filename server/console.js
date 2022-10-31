/**
 * Styles text with shell options.
 *
 * @param {String} text The standard input text value.
 * @param {String|Number} opts Accepts options and values as a string, or color code as a number.
 * 		-c <color:name|value>
 * 		-s <italic|strike|underline>
 * 		-w <:empty>
 * 		 # When providing a value without an option name, used as the color value.
 * @return {String} Returns the text with escaped styles.
 */
console.font = (text, opts) => {
	opts = (opts ? opts + '' : '').trim().split(/\s+/);
	for (let n = 0; n < opts.length; n++) {
		!isNaN(+opts[n]) && opts[n - 1] !== '-c' && opts.splice(n, 0, opts[n]) && (opts[n] = '-c');
		if (opts[n][0] === '-') switch (opts[n].substring(1)) {
			case 'c': /* color */ {
				const color = (opts[n + 1] || '').toLowerCase();
				switch (color) {
					case 'black':   text = `\x1b[30m${text}`; break;
					case 'red':     text = `\x1b[31m${text}`; break;
					case 'green':   text = `\x1b[32m${text}`; break;
					case 'yellow':  text = `\x1b[33m${text}`; break;
					case 'blue':    text = `\x1b[34m${text}`; break;
					case 'magenta': text = `\x1b[35m${text}`; break;
					case 'cyan':    text = `\x1b[36m${text}`; break;
					case 'white':   text = `\x1b[37m${text}`; break;
					case 'gray':
					case 'grey':    text = `\x1b[90m${text}`; break;
					default: /^\d+$/.test((color + '')) && (text = `\x1b[${color}m${text}`); break;
				}
				break;
			}
			case 's': /* font-style */ {
				switch ((opts[n + 1] || '').toLowerCase()) {
					case 'italic':    text = `\x1b[3m${text}`; break;
					case 'strike':    text = `\x1b[9m${text}`; break;
					case 'underline':
					default:          text = `\x1b[4m${text}`; break;
				}
				break;
			}
			case 'w': /* font-weight */ {
				text = `\x1b[1m${text}`;
				break;
			}
		}
	}
	return `${text}\x1b[0m`;
};
