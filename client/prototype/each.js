Hekate.prototype.each = function (fn) {
	fn = typeof fn === 'function' ? fn : Hekate.noop;
	for (let i = 0; i < this.length; i++) {
		fn.call(this[i], i, this[i]);
	}
	return this;
};
