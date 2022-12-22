Object.defineProperties(String.prototype, {
	toCamelCase: { value: function toCamelCase () {
		return this.replace(/\s+/g, '-').replace(/^[a-z]/i, a => a.toLowerCase()).replace(/-[a-z]/ig, a => a[1].toUpperCase());
	}},
	toCapital: { value: function toCapital () {
		return this.split(' ').map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(' ');
	}},
	fromMarkdown: { value: (() => {
		const rx = {
			esc: new RegExp(`[\\${'\\$#!`[(*_)]'.split('').join('\\')}]`, 'g'),
			hn: /^([#]{1,6})(.+?)$/,
			attrs: /(?:\[.+?\]|\.[^=\.#'"\[\]]+|#[^=\.#'"\[\]]+)/g,
			code: /`(.+?)`/g,
			list: /^(\d+\.|\-|\*)/,
			li: /^\s*(\d+\.|\-|\*)\s*/,
			ul: /^[\*\-]$/,
			liattrs: /^\((.+?)\)\s+(.+)$/,
			link: /(!)?\[([^\[\]]+)\]\(([^"\(\)]+)(?: "([^"]+)")?\)/g,
			span: /\[([\s\S]+?)\]/g,
			strong: /(?:\*\*([\s\S]+?)\*\*|\b__([\s\S]+?)__\b)/g,
			em: /(?:\*([\s\S]+?)\*|\b_([\s\S]+?)_\b)/g,
			pre: /<(pre|code)>([\s\S]+?)<\/\1>/g,
			tag: /^<([^>]+)>/,
			line: /\s\s$/m,
			entity: /&#(\d+);/g
		};
		const fn = {
			attr (str) {
				return ((str[0][0] === '(' && str[0].slice(-1) === ')') ? str[0].slice(1, -1) : '').match(rx.attrs) || [];
			},
			code (str, raw) {
				return str
					.replace(new RegExp(rx.esc, 'g'), i => `&#${i.charCodeAt()};`)
					.replace(/</g, raw ? '<' : '&#x3c;').replace(/>/g, raw ? '>' : '&#x3e;');
			},
			html (str) {
				if (/^#/.test(str)) /* <hn> */ {
					str = str.replace(rx.hn, (...i) => `<h${i[1].length}${i[3] ? ` ${i[3]}${i[5] ? `="${i[5]}"` : ''}` : ''}>${i[2].trim()}</h${i[1].length}>`);
				} else if (rx.list.test(str)) /* <ul|ol> */ {
					str = fn.list(str, 0);
				} else if (str[0] !== '<') /* <p> */ {
					str = '<p>' + str.replace(rx.line, '<br>') + '</p>';
				}
				return str
					.replace(rx.code, (...i) => `<code>${fn.code(i[1])}</code>`) // Inline code
					.replace(rx.link, (...i) => i[1]
						? `<img src="${i[3]}"${i[4] ? ` title="${i[4]}"` : ''} alt="${i[2]}">`
						: `<a href="${i[3]}"${i[4] ? ` title="${i[4]}"` : ''}>${i[2]}</a>`
					) // Images & URLs
					.replace(rx.span, '<span>$1</span>') // Span
					.replace(rx.strong, (...i) => `<strong>${i[1] || i[2]}</strong>`) // Bold text
					.replace(rx.em, (...i) => `<em>${i[1] || i[2]}</em>`) // Italicized text
				;
			},
			list (str, lvl = 0) {
				const tag = rx.ul.test((str.match(rx.li) || [,'*'])[1]) ? 'ul' : 'ol';
				str = str.split(new RegExp('(?:^|\\n)' + '\\t'.repeat(lvl) + '(?:\\d+\\.|\\-|\\*)\\s')).filter(Boolean);
				str = `<${tag}>` + str.map(i => (i = i.split('\n')) && ('\n' + '\t'.repeat(lvl + 1)
					+ (
						(i[0] = i[0].match(rx.liattrs) || [ , '', i[0] ])
						&& fn.tag(`<li>${i[0][2]}`, i[0][1].match(rx.attrs))
					)
					+ (i.length > 1
						? fn.list(i.slice(1).join('\n'), lvl + 1)
						: ''
					)
					+ '</li>')
				).join('') + `\n</${tag}>`;
				return str;
			},
			mkdwn (str) {
				return ('\n\n' + str + '\n\n')
					.replace(/\n\n/g, '\n'.repeat(4))
					.split('\n\n')
					.filter(i => i && i !== '\n');
			},
			tag (str, att) {
				return (att || []).length ? str.replace(rx.tag, (...i) => {
					const _id = [];
					const cls = [];
					const ats = [];
					att.map(i =>
						  i[0] === '#' ? _id.push(i.substring(1))
						: i[0] === '.' ? cls.push(i.substring(1))
						: i[0] === '[' ? ats.push(i.substring(1, i.length - 1))
						: false
					);
					return `<${i[1]}`
						+ (_id.length ? ` id="${_id[0]}"` : '')
						+ (cls.length ? ` class="${cls.join(' ')}"` : '')
						+ (ats.length ? ` ${ats.join(' ')}` : '')
						+ `>`;
				}) : str;
			}
		};
		return function fromMarkdown () {
			return fn.mkdwn(this).map((str, att) => {
				try {
				str = str.split('\n');
				if (str.every(i => i[0] === '\t')) { // Code block;
					str = str.map(i => i.substring(1));
					att = fn.attr(str);
					str = att.length ? str.slice(1) : str;
					str = `<pre>${fn.code(str.join('\n'), att.includes('raw'))}</pre>`;
				} else if (str.every(i => i[0] === '>')) { // Blockquote
					att = fn.attr(str);
					str = att.length ? str.slice(1) : str;
					str = `<blockquote>${fn.mkdwn(str.map(i => i.substring(1)).join('\n\n')).map(i => fn.html(i)).join('\n')}</blockquote>`;
				} else {
					att = fn.attr(str);
					str = att.length ? str.slice(1) : str;
					str = fn.html(str.join('\n'));
				}
				str = str.replace(rx.pre, (...i) => `<${i[1]}>${i[2].replace(rx.entity, (...i) => String.fromCharCode(+i[1]))}</${i[1]}>`);
				str = fn.tag(str, att);
				return str;
			}catch(e){console.log(e)}
			})
			.join('\n');
		};
	})()},
	toSlug: { value: function toSlug () {
		let str = this.toLowerCase();
		for (let [x, y] of [
			[ /[àáâãäåāăą]/g, 'a' ],
			[ /[æ]/g, 'ae' ],
			[ /[çćĉċč]/g, 'c' ],
			[ /[ďđ]/g, 'd' ],
			[ /[èéêëēėęě]/g, 'e' ],
			[ /[ƒ]/g, 'f' ],
			[ /[ĝğġǵ]/g, 'g' ],
			[ /[ĥħ]/g, 'h' ],
			[ /[ìíîïĩīį]/g, 'i' ],
			[ /[ĳ]/g, 'ij' ],
			[ /[ĵ]/g, 'j' ],
			[ /[ķĸ]/g, 'k' ],
			[ /[ĺļľŀł]/g, 'l' ],
			[ /[ñńņňŉ]/g, 'n' ],
			[ /[ŋ]/g, 'ng' ],
			[ /[òóôõöøōő]/g, 'o' ],
			[ /[œ]/g, 'oe' ],
			[ /[ŕŗř]/g, 'r' ],
			[ /[ßśŝşš]/g, 's' ],
			[ /[ţťŧ]/g, 't' ],
			[ /[ðþ]/g, 'th' ],
			[ /[ùúûüũūŭůűų]/g, 'u' ],
			[ /[ŵ]/g, 'w' ],
			[ /[ýÿŷ]/g, 'y' ],
			[ /[ƶźżž]/g, 'z' ],
			[ /[\.·\/_,:;|\(\)=]/g, '-' ],
			[ /[^\w\d -]/g, '' ],
			[ /\s+/g, '-' ],
			[ /-+/g, '-' ],
			[ /^-(.+)$/, '$1' ],
			[ /^(.+)-$/, '$1' ]
		]) str = str.replace(x, y);
		return str;
	}}
});
