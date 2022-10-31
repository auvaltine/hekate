Hekate.prototype.style = function (style) {
	const css = {};
	typeof style === 'string' && (style = [ style ]);
	if (style instanceof Array) {
		const node = this[0];
		const comp = window.getComputedStyle(node);
		let prop;
		for (let i = 0; i < style.length; i++) {
			let valu;
			prop = style[i] === 'float' ? 'cssFloat' : style[i].toCamelCase();
			if (Hekate.regex.scroll.test(prop)) {
				valu = node[prop];
			} else if (prop === 'outerHeight') {
				valu = node.offsetHeight
					 + Math.abs(parseFloat(comp.marginBottom || 0))
					 + Math.abs(parseFloat(comp.marginTop || 0));
			} else if (prop === 'outerWidth') {
				valu = node.offsetWidth
					 + Math.abs(parseFloat(comp.marginLeft || 0))
					 + Math.abs(parseFloat(comp.marginRight || 0));
			} else if (prop === 'innerWidth') {
				valu = node.offsetWidth
					 - Math.abs(parseFloat(comp.paddingLeft || 0))
					 - Math.abs(parseFloat(comp.paddingRight || 0));
			} else if (node.style) {
				valu = node.style[prop];
				valu = valu || comp[prop];
				valu = prop === 'width' && Hekate.regex.auto.test(valu) ? node.offsetWidth
					 : prop === 'height' && Hekate.regex.auto.test(valu) ? node.offsetHeight
					 : valu;
			}
			css[prop] = Hekate.regex.pixel.test(valu) ? parseFloat(valu) : valu;
		}
		return style.length === 1 ? css[prop] : css;
	}
	return this.each(function () {
		for (let i in style) {
			if (style.hasOwnProperty(i)) {
				const prop = i === 'float' ? 'cssFloat' : i.slice(0, 2) === '--' ? i : i.toCamelCase();
				if (prop.substr(0, 2) === '--') {
					this.style.setProperty(prop, style[i]);
				} else if (Hekate.regex.scroll.test(prop)) {
					this[prop] = style[i];
				} else if (Hekate.regex.opacityZ.test(prop)) {
					this.style[prop] = style[i];
				} else if (Hekate.regex.pixel.test(style[i])) {
					this.style[prop] = parseFloat(style[i]) + 'px';
				} else {
					this.style[prop] = style[i];
				}
			}
		}
	}).emit('style', style);
};
