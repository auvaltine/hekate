/**
 * Gets or sets innerText.
 *
 * @param {String|Number} [text] - Omit to read from the first selected element.
 * @return {String|Hekate}
 */
Hekate.prototype.text = function (text) {
	return this.length && text === undefined
		 ? this[0].innerText
		 : this.each(function () { this.innerText = text; });
};
