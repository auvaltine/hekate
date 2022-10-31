Hekate.prototype.closest = function (find) {
	const elems = new Hekate();
	find = new Hekate(find);
	this.each(function () {
		let node = this;
		do if (new Hekate(node).is(find)) { elems.push(node); } while (!elems.length && (node = node.parentNode));
	});
	return elems;
};
