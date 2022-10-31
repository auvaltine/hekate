Hekate.prototype.remove = function (event) {
	if (event === undefined) {
		this.each(function () { this.parentNode && this.parentNode.removeChild(this); });
	}
	return this;
};
