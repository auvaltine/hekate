/**
 * Gets parent elements, optionally matching a selector and/or walking all ancestors.
 *
 * @param {String|Boolean} [find] - Selector to match, or true to include all ancestors.
 * @param {Boolean} [deep=false] - When true, walks through all ancestors.
 * @return {Hekate}
 */
Hekate.prototype.parent = function (find, deep = false) {
	deep = find === undefined || find === true ? find : deep;
	typeof find === 'string' && (find = Hekate.css.token(find).query);
	const elems = new Hekate();
	const context = deep
		? this.map(e => { const elems = []; while (e = e.parentNode) elems.push(e); return elems; }).flat()
		: this.map(e => e.parentNode);
	find instanceof Array
		? find.forEach(find => elems.push(...Hekate.css.filter(find, context)))
		: elems.push(...context);
	return elems;
};
