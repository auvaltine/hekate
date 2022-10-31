Hekate.prototype.push = function () {
	const ns = this[0] && this[0].namespaceURI === 'http://www.w3.org/2000/svg' ? 'svg' : 'html';
	for (let node of arguments) {
		typeof node === 'string' && (node = new Hekate(node, ns));
		if (node instanceof Hekate) {
			for (let i of node) {
				this[this.length++] = i;
			}
		} else {
			this[this.length++] = node;
		}
	}
	return this;
};
