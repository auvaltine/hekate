Hekate.prototype.filter = function (find) {
	switch (typeof find) {
		case 'function': {
			const filter = new Hekate();
			for (let i = 0; i < this.length; i++) {
				find(this[i]) && filter.push(this[i]);
			}
			return filter;
		}
		case 'string': return new Hekate(Hekate.css.token(find).query.map(find => Hekate.css.filter(find, this)).flat());
		case 'object':
		case find.nodeType === 1: return Array.prototype.filter.call(this, a => a === find);
	}
};
