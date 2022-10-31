Hekate.prototype.prev = function () {
	const elems = [];
	this.each(function () { elems.push(this.previousElementSibling); });
	return new Hekate(elems.filter(Boolean));
};
