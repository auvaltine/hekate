Hekate.css = Object.assign(function (find, ctxt) {
	let selc = find;
	ctxt = ctxt || document;
	find = find === window || find === document ? [ find ]
		: find === 'body' ? [ document.body ]
		: find === 'html' ? [ document.documentElement ]
		: (() => {
			const elems = [];
			ctxt = new Hekate(ctxt);
			find = this.css.token(find);
			find.query.map(find => elems.push(...Hekate.css.filter(find, Hekate.css.context(find, ctxt))));
			selc = find.selector;
			return elems;
		})();
	return { selector: selc, elems: find };
}, {

	/**
	 * Define custom pseudo-selectors via:
	 *
	 * 	- Hekate.css.pseudo[selector-name] = function ([string]) {}
	 * 	- Hekate.css.pseudo.selectorName = function ([string]) {}
	 *
	 * :selector-name([string]) [thisArg = matched element]
	 */
	pseudo: {
		button () { return this.nodeName.toLowerCase() === 'button' || this.type === 'button'; },
		checked () { return this.checked; },
		checkbox () { return this.type === 'checkbox'; },
		contains (a) { return (this.value || this.innerText).includes(a.substring(1, match.length - 1)); },
		data (a) { return !!Hekate.data(this).data[a]; },
		empty () { return !this.childNodes.length; },
		firstChild () { return this === this.parentNode.children[0]; },
		input () { return Hekate.css.rules.input.test(this.tagName); },
		lastChild (a) { return this === (a = this.parentNode.children)[a.length - 1]; },
		not (a) { return (a = Hekate.css.token(a).query).filter(a => Hekate.css.match.call(a, this)).length === find.length; },
		radio () { return this.type === 'radio'; },
		visible () { return !!(this.clientHeight && this.clientWidth); }
	},

	rules: /* RegExp rules */ {
		attr: /^\[\s*([^ "'|~!$^*>\/='"]+)(?:([~!$^*|])?=\s*(?:'([^']*)'|"([^"]*)"|([^\s\]]+)))?(?:\s+([is]))?\s*\]$/i,
		block: /(?:\((?:[^)]*"[^"]*"|[^)]*'[^']*'|[^)]*)\s*\)|\[(?:(?:[^=\]]+(?:[~!$^*|])?=\s*)?(?:"[^"]*"|'[^']*'|[^\]]*))(?:\s+[ic])?\s*\])/g,
		input: /^(?:button|input|select|textarea)$/i,
		pseudo: /^:([\w-]+)(?:\((.*)\))?$/,
		node: /^[^ #\.:\[\(,>\+~]+/,
		selectors: /([^#.\[\]"'\(\):]+|[#.][^#.\[:]+|:[\w-]+(\(.+\))?|\[([^\]]+\]))/g,
		split: /[,>\+~ ]/,
		splitFormat: /([ \+>~])/g,
		trim: /\s*([,>\+~ ])\s*/g,
		token: (() => {
			const sa = '~#()+[]:,.> '.split('');
			const ra = '\ue000\ue001\ue002\ue003\ue004\ue005\ue006\ue007\ue008\ue009\ue010\ue011'.split('');
			const sr = new RegExp(`[\\${sa.join('\\')}]`, 'g');
			const rr = new RegExp(`[${ra.join('')}]`, 'g');
			return (str, r = false) => str.replace(r ? rr : sr, a => (r ? sa : ra)[(r ? ra : sa).indexOf(a)]);
		})(),
		ws: /\s+/g
	},

	/**
	 * Retrieves a basic group of elements within the document.
	 *
	 * @param {String} selector: The CSS string to select elements.
	 * @param {HTMLElement} context: A group of existing elements to search for the selector.
	 * @return {Array} Returns an array of matching selected elements.
	 */
	context (selector, context) {
		let i;
		selector || (selector = {});
		context instanceof Array || (context = [ context ]);
		return [].concat(...context.filter(elem => elem.nodeType === 1 || elem.nodeType === 9).map(elem =>
			  selector['#'] ? [ elem.getElementById(selector['#']) ]
			: selector['.'] ? Array.from(elem.getElementsByClassName(selector['.'][0]))
			: selector.node ? selector.node.split('|').map(i => Array.from(elem.getElementsByTagName(i))).flat()
			: Array.from(elem.getElementsByTagName('*'))
		));
	},

	/**
	 * Filters matching elements from the <context> group.
	 *
	 * @param {String} selector: The CSS string to select elements.
	 * @param {HTMLElement} context: A group of existing elements to search for the selector.
	 * @return {Array} Returns an array of matching selected elements.
	 */
	filter (selector, context) {
		return context.map(Hekate.css.match, selector).flat().filter(Boolean);
	},

	/**
	 * Matches an element using <thisArg> properties.
	 *
	 * <thisArg> contains:
	 * 	- node: The HTMLElement
	 * 	- "#": An ID string
	 * 	- ".": A list of class names
	 * 	- "[": A list of attributes
	 * 	- ":": A list of pseudo-selectors
	 * 	- combinator: One of " ", "~", "+", ">" to continue matching
	 *
	 * @param {HTMLElement} elem: An HTML element to test for a match.
	 * @return {HTMLElement|null} Returns the same element if matched, or null.
	 */
	match (elem) {
		let i;
		return this.nodeType ? (this === elem ? elem : null) : (
				(elem && elem.nodeType === 1)
			&& (!(i = this.node) || i === '*' || i.split('|').includes(elem.tagName.toLowerCase()))
			&& (!(i = this['#']) || i === elem.id)
			&& (!(i = this['.']) || i.every(a => elem.classList.contains(a)))
			&& (!(i = this['[']) || i.every(a => (i = elem.attributes[a.name]) && (a.value === undefined || (
				  a.operator === '~' ? !!i.value.match(`(?:^|\s)${a.value}(?:\s|$)`)
				: a.operator === '!' ?   i.value !== a.value
				: a.operator === '$' ?   i.value.substring(i.value.length - a.value.length) === a.value
				: a.operator === '^' ?   i.value.substring(0, a.value.length) === a.value
				: a.operator === '*' ?   i.value.includes(a.value)
				: a.operator === '|' ? !!i.value.match(`^${a.value}(?:-|$)`)
				: i.value === a.value
			))))
			&& (!(i = this[':']) || i.every(a => a.fn.call(elem, a.args)))
			&& (!(i = this.combinator) || (elem = (c => {
				switch (i.type) {
					case ' ': { elem = Hekate.css.context(i.query, elem); break; }
					case '~': { elem = (c = Array.from(elem.parentNode.childNodes).filter(e => e.nodeType === 1)).slice(c.indexOf(elem) + 1); break; }
					case '+': { elem = [ elem.nextElementSibling ]; break; }
					case '>': { elem = Array.from(elem.childNodes).filter(e => e.nodeType === 1); break; }
				}
				return Hekate.css.filter(i.query, elem);
			})()))
		) ? elem : null;
	},

	/**
	 * Tokenizes a selector to describe its properties.
	 *
	 * @param {String} find: The selector to tokenize.
	 * @return {Object} Returns an object with <selector> and <query> keys.
	 */
	token (find) {
		const rules = Hekate.css.rules;
		return {
			selector: rules.token((find = Array.from(new Set(find.replace(rules.block, a => {
				const b = [ a[0], a.substring(a.length - 1) ];
				return b[0] + rules.token(a.substring(1, a.length - 1)) + b[1];
			}).replace(rules.trim, '$1').split(',')))).join(', ').replace(rules.splitFormat, ' $1').replace(rules.ws, ' '), true),
			query: find.map(function token (elem) {
				const node = `${elem},`.match(rules.split);
				elem = {};
				(node.input.substring(0, node.index).match(rules.selectors) || []).map(a => {
					switch (a[0]) {
						case '#': (elem['#'] = a.substring(1)); break;
						case '.': (elem['.'] || (elem['.'] = [])).push(a.substring(1)); break;
						case '[': {
							a = rules.token(a, true).match(rules.attr);
							(elem['['] || (elem['['] = [])).push({
								case: (a[6] || 's').toLowerCase(),
								name: a[1],
								operator: a[2],
								value: a[3] || a[4] || a[5]
							});
							break;
						}
						case ':': {
							a = rules.token(a, true).match(rules.pseudo);
							(elem[':'] || (elem[':'] = [])).push({
								args: a[2],
								fn: Hekate.css.pseudo[a[1]] || Hekate.css.pseudo[a[1].toCamelCase()] || Hekate.noop
							});
							break;
						}
						default: (elem.node = a); break;
					}
				});
				node[0] && node[0] !== ',' && (elem.combinator = {
					type: node[0],
					query: token(node.input.substring(node.index + 1, node.input.length - 1))
				});
				if (!(elem.node = (node.input.match(rules.node) || [])[0])) {
					delete elem.node;
				}
				return elem;
			})
		};
	}
});
