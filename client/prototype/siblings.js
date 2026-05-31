/**
 * Gets sibling elements, optionally filtered by selector.
 *
 * @param {String} [find]
 * @return {Hekate}
 */
Hekate.prototype.siblings = function (find) {
	const siblings = new Hekate();
	this.each(function() { siblings.push(new Hekate(this).parent().children(find).not(this)); });
	return siblings;
};
