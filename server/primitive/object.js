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
	walk: { value: function walk (key, returnParent = false, createIfNone = false) {
		const orig = key;
		const keys = key.split('.');
		let object = this;
		while (key = keys.shift()) {
			if (keys.length) {
				if (object[key] === undefined) {
					if (createIfNone) {
						object[key] = {};
						object = object[key];
					} else {
						return undefined;
					}
				} else {
					object = object[key];
				}
			} else {
				return returnParent
					? object
					: key
						? object[key]
						: object instanceof Array
							? object[-1]
							: undefined;
			}
		}
	}}
});
