/**
 * Debounces a function per element, replacing any previous pause timer on that element.
 *
 * @param {Date|Number|String|Function} delay - Date.setTimeout-compatible delay.
 * @param {Function} fn - Called with this set to the element.
 * @return {Hekate}
 */
Hekate.prototype.pause = function (delay, fn) {
	return this.each(function () {
		const elem = new Hekate(this);
		elem.data('pause') && elem.data('pause').stop();
		elem.data('pause', Date.setTimeout(fn.bind(this), delay));
	});
};
