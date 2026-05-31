/**
 * Gets the next sibling element for each selected element.
 *
 * @return {Hekate}
 */
Hekate.prototype.next = function () {
	const elems = [];
	this.each(function () { elems.push(this.nextElementSibling); });
	return new Hekate(elems);
};
