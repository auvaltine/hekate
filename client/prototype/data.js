Hekate.prototype.data = function (name, value) {
	if (value === undefined) {
		if (name === undefined) {
			return Hekate.data(this[0]);
		} else {
			value = this[0] && this[0].dataset;
			value && (value = value[name.toCamelCase()]);
			return value === undefined ? Hekate.data(this[0]).data[name] : value;
		}
	} else {
		return this.each(function () { Hekate.data(this).data[name] = value; });
	}
};
