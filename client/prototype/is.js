Hekate.prototype.is = function (find) {
	if (typeof find === 'string') {
		find = new Hekate(find);
		for (let i of this) {
			for (let f of find) {
				if (f === i) { return true; }
			}
		}
	} else if (find.nodeType) {
		for (let i = 0; i < this.length; i++) {
			if (this[i] === find) { return true; }
		}
	} else if (find instanceof Hekate) {
		for (let i = 0; i < this.length; i++) {
			for (let f = 0; f < find.length; f++) {
				if (this[i] === find[f]) { return true; }
			}
		}
	}
	return false;
};
