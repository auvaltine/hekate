Hekate.prototype.off = function (evnt) {
	return this.each(function () {
		const evnts = Hekate.data(this).events;
		for (let i in evnts) {
			let e = i.substring(0, evnt.length);
			if (e === evnt) {
				const type = i.split('.')[0];
				for (let fn of evnts[i]) {
					this.removeEventListener(type, fn);
				}
				delete evnts[i];
			}
		}
	});
};
