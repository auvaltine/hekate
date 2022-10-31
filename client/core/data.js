Hekate.data = (() => {
	const data = [];
	return elem => {
		if (elem) {
			for (let i of data) {
				if (i.elem === elem) { return i; }
			}
		}
		data.push(elem = { elem: elem, data: {}, events: {} });
		return elem;
	};
})();
