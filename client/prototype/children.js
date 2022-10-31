Hekate.prototype.children = function (find, deep = false) {
	deep = find === undefined || find === true ? find : deep;
	typeof find === 'string' && (find = Hekate.css.token(find).query);
	const elems = new Hekate();
	const context = deep
		? Hekate.css.context(find, this)
		: this.map(e => Array.from(e.childNodes).filter(e => e.nodeType === 1)).flat();
	find instanceof Array
		? find.forEach(find => elems.push(...Hekate.css.filter(find, context)))
		: elems.push(...context);
	return elems;
};
