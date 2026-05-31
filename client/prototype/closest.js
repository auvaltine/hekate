/**
 * Finds the nearest ancestor, including the element itself, matching a selector or element.
 *
 * @param {String|Element|Hekate} find
 * @return {Hekate}
 */
Hekate.prototype.closest = function (find) {
	const elems = new Hekate();
	find = new Hekate(find);
	this.each(function () {
		let node = this;
		do if (new Hekate(node).is(find)) { elems.push(node); } while (!elems.length && (node = node.parentNode));
	});
	return elems;
};
