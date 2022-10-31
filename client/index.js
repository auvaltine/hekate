class Hekate extends Array {
	static hidden = {
		html: document.createElement('template'),
		svg: document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	};
	static instance = window.crypto ? window.crypto.randomUUID() : `HekateClient_${Date.now()}`;
	static nonce = Object.assign(() => `${Hekate.instance}_${Hekate.nonce.increment++}`, { increment: 0 });
	static noop = () => {};
	static regex = {
		alphanum: /^[0-9a-z]$/i,
		auto: /^(?:0px|auto)$/,
		id: /^#[^\s\.:\[>+~'"]+$/,
		doctype: /^\s*<!doctype(?: [^>]+)?>/i,
		html: /^\s*</,
		load: /^(?:complete|interactive|loaded)$/,
		modifier: /[#\.\[:]/,
		opacityZ: /^(?:opacity|zIndex)$/,
		pixel: /^-?(?:\d+\.\d+|\.\d+|\d+)(?:px)?$/,
		scroll: /^scroll(?:Left|Top)$/,
		ws: /\s+/g
	};
	static export = Object.assign((...args) => new Hekate(...args), Hekate);

	constructor (find, ctxt = document) {
		super();
		this.selector = '';
		if (find instanceof Hekate) {
			return find;
		} else if (find === window || find === document || (find && find.documentElement && (find = find.documentElement))) {
			this.push(find);
		} else if (find instanceof Array) {
			this.push(...find.map(e => typeof e === 'string' ? Hekate.fromString(e, ctxt) : e).flat());
		} else switch (typeof find) {
			case 'string': {
				if ((find = find.trim())) {
					if (Hekate.regex.html.test(find)) {
						this.push(...Hekate.fromString(find, ctxt));
					} else {
						this.push(...(find = Hekate.css(find, ctxt)).elems);
						this.selector = find.selector;
					}
				}
				break;
			}
			case 'object': { this.push(...Array.from(find.nodeType ? [ find ] : find)); break; }
			case 'function': {
				Hekate.regex.load.test(document.readyState)
					? find.call(window, Hekate.export)
					: document.addEventListener('DOMContentLoaded', find.bind(window, Hekate.export), false);
				break;
			}
		}
	};
};
