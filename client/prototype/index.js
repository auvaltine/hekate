Hekate.prototype.index = function (i) {
	return isNaN(i)
		? (i instanceof Hekate ? this.indexOf(i[0]) : this.indexOf(i))
		: new Hekate(this[i]);
};
