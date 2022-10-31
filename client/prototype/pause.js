Hekate.prototype.pause = function (delay, fn) {
	return this.each(function () {
		const elem = new Hekate(this);
		elem.data('pause') && elem.data('pause').stop();
		elem.data('pause', Date.setTimeout(fn.bind(this), delay));
	});
};
