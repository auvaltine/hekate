Hekate.prototype.next = function () {
	const elems = [];
	this.each(function () { elems.push(this.nextElementSibling); });
	return new Hekate(elems);
};
