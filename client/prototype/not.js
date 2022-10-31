Hekate.prototype.not = function (find) {
	if (this.length) {
		if (find instanceof Hekate) {
			const a = new Hekate();
			this.forEach(elem => ~find.indexOf(elem) || a.push(elem));
			return a;
		} else {
			const a = new Set(this.filter(find));
			return new Hekate([ ...new Set([ ...this ].filter(b => !a.has(b))) ]);
		}
	}
	return new Hekate();
};
