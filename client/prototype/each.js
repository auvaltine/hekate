/**
 * Runs a function once for each selected element.
 *
 * @param {Function} fn - Called as fn(index, element), with this set to the element.
 * @return {Hekate}
 */
Hekate.prototype.each = function (fn) {
	fn = typeof fn === 'function' ? fn : Hekate.noop;
	for (let i = 0; i < this.length; i++) {
		fn.call(this[i], i, this[i]);
	}
	return this;
};
