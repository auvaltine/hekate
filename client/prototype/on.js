/**
 * Registers event handlers, with optional delegated selector and once behavior.
 *
 * @param {String|Object} evnt - Event name/list, namespace, or map of event names to functions.
 * @param {String|Function} [trgt] - Delegated selector, or handler.
 * @param {Function|Boolean} [fn] - Handler, or once flag.
 * @param {Boolean} [once=false] - When true, removes the listener after one call.
 * @return {Hekate}
 */
Hekate.prototype.on = function (evnt, trgt, fn, once, type) {
	if (typeof evnt === 'string') {
		type = evnt;
		evnt = {};
		once = typeof fn === 'boolean' ? fn : once;
		fn = typeof trgt === 'function' ? trgt : typeof fn === 'function' ? fn : Hekate.noop;
		trgt = typeof trgt === 'string' ? trgt : undefined;
		type = type.split(Hekate.regex.ws).map(e => (evnt[e] = fn) && e);
	} else {
		once = fn;
	}
	once = Boolean(once);
	return this.each(function () {
		for (let i in evnt) {
			const evnts = Hekate.data(this).events;
			const fn = evnt[i];
			const type = i.split('.');
			const name = type.slice(1).join('.');
			(evnts[i] || (evnts[i] = [])).push((event, elem) => trgt
				? (elem = new Hekate(event.target).closest(trgt)).length && fn.call(elem[0], event)
				: fn.call(this, event));
			this.addEventListener(type[0], evnts[i][evnts[i].length - 1], { once: once });
		}
	});
};
