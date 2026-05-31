/**
 * Gets or stores private data for an element, falling back to data-* attributes when reading.
 *
 * @param {String} [name] - Data key. Omit to return the internal data record.
 * @param {*} [value] - Value to store.
 * @return {*|Hekate}
 */
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
