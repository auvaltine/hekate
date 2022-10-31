Hekate.prototype.attr = function (name, value, set) {
	set = set === undefined ? true : set;
	if (value === undefined) {
		value = this[0].getAttribute(name);
		return value;
	}
	value === null && (value = '');
	return this.each(function () {
		if (set === false) {
			if (name === 'class') {
				var cName = (this.getAttribute('class') || '').split(Hekate.regex.ws);
				value.split(Hekate.regex.ws).forEach(value => {
					const i = cName.indexOf(value);
					~i && cName.splice(i, 1);
				});
				this.setAttribute('class', cName.join(' '));
				return;
			}
		} else if (value === false) {
			this.removeAttribute(name);
		} else {
			if (name === 'class') {
				value = (this.getAttribute('class') || '') + ' ' + value;
				value = value.trim().split(' ').unique().join(' ');
			}
			this.setAttribute(name, value);
		}
	});
};
