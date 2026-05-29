Object.defineProperties(Object, {
	same: { value: function same (a, b) {
		return Object.keys(a).length === Object.keys(b).length
			 ? Object.keys(a).every(key => b.hasOwnProperty(key) && b[key] === a[key])
			 : false;
	}},
	isObject: { value: function isObject (obj) {
		return obj && Object.prototype.toString.call(obj) === '[object Object]';
	}},
	merge: { value: function merge (...src) {
		const isMergeable = src => {
			return src && typeof src === 'object'
				&& Object.prototype.toString.call(src) !== '[object RegExp]'
				&& Object.prototype.toString.call(src) !== '[object Date]'
		};
		return src.reduce((tar, src) => {
			let des;
			if (Array.isArray(src)) {
				if (Array.isArray(tar)) {
					des = tar.slice();
					src.forEach(function(e, i) {
						if (typeof des[i] === 'undefined') {
							des[i] = e;
						} else if (isMergeable(e)) {
							des[i] = Object.merge(tar[i], e);
						} else if (!~tar.indexOf(e)) {
							des.push(e);
						}
					});
				} else {
					des = src;
				}
			} else {
				des = {}
				isMergeable(tar) && Object.keys(tar).forEach(i => des[i] = tar[i]);
				Object.keys(src).forEach(i => des[i] = !isMergeable(src[i]) || !tar[i]
					? src[i]
					: Object.merge(tar[i], src[i])
				);
			}
			return des;
		});
	}}
});
Object.defineProperties(Object.prototype, {
	/**
	 * Walks a dot-notated object path.
	 *
	 * @param {String} key: A dot-notated object path.
	 * @param {Boolean} returnParent: If truthy, return the parent tree of the final key.
	 * @param {Boolean} createIfNone: If truthy, create missing nodes along the full path.
	 * @return {*} Returns the final node, parent node, or undefined.
	 */
	walk: { value: function walk (key, returnParent = false, createIfNone = false) {
		const keys = key.split('.');
		const last = keys.pop();
		let object = this;
		for (const key of keys) {
			if (object[key] === undefined) {
				if (createIfNone) {
					object[key] = {};
				} else {
					return undefined;
				}
			}
			object = object[key];
			if (!Object.isObject(object)) {
				return undefined;
			}
		}
		if (last && object[last] === undefined && createIfNone) {
			object[last] = {};
		}
		return returnParent
			? object
			: last
				? object[last]
				: object instanceof Array
					? object[-1]
					: undefined;
	}}
});
