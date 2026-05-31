/**
 * Gets the index of an element in the current selection, or wraps the element at a numeric index.
 *
 * @param {Number|Element|Hekate} i
 * @return {Number|Hekate}
 */
Hekate.prototype.index = function (i) {
	return isNaN(i)
		? (i instanceof Hekate ? this.indexOf(i[0]) : this.indexOf(i))
		: new Hekate(this[i]);
};
