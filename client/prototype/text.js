Hekate.prototype.text = function (text) {
	return this.length && text === undefined
		 ? this[0].innerText
		 : this.each(function () { this.innerText = text; });
};
