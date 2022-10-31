Hekate.prototype.copy = function (deep = false) {
	const clone = new Hekate();
	deep = Boolean(deep);
	this.each(function () { clone.push(this.cloneNode(deep)); });
	clone.selector = this.selector;
	return clone;
};
