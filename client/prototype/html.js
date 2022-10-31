Hekate.prototype.html = function (elem, type = 'insert') {
	const create = typeof elem === 'string' || typeof elem === 'number';
	let temp = [];
	return type === 'into' && (typeof elem === 'string' || elem instanceof Hekate) ? (new Hekate(elem).map(e => e.appendChild(this[0])) && this)
		 : elem === undefined ? this[0] && this[0].innerHTML
		 : elem === true ? this.map(e => temp.push(e.outerHTML)) && temp.join('')
		 : this.each(function () {
			const node = this.parentNode;
			let html = elem;
			if (create || !(html instanceof Hekate)) {
				html = create ? ('' + html).trim() : html;
				html = new Hekate(
					!create || html[0] === '<' ? html : document.createTextNode(html),
					this.namespaceURI === 'http://www.w3.org/2000/svg' ? 'svg' : 'html'
				);
			}
			switch (type) {
				case 'after': html.reverse().map(e => node.insertBefore(e, this.nextElementSibling)); break;
				case 'append': html.map(e => this.appendChild(e)); break;
				case 'before': html.map(e => node.insertBefore(e, this)); break;
				case 'prepend': html.reverse().map(e => this.insertBefore(e, this.firstChild)); break;
				case 'replace': {
					html.map(e => node.insertBefore(e, this));
					node.removeChild(this);
					html.emit('html', { html: elem, type: type });
					break;
				}
				case 'wrap': {
					let chld;
					temp = Hekate.hidden.html.content.firstChild;
					html = chld = temp.cloneNode(true);
					while (chld.firstChild && (html = chld.firstChild));
					node.replaceChild(html, this);
					chld.appendChild(this);
					break;
				}
				case 'insert':
				default: {
					this.innerHTML = '';
					html.map(e => this.appendChild(e));
					break;
				}
			}
			new Hekate(this).emit('html', { html: html, type: type })
		  });
};
