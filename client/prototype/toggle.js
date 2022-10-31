Hekate.prototype.toggle = function (value) {
	return this.each(function () {
		let elem;
		if (value === undefined) {
			elem = new Hekate(this);
			elem.style({ display: elem.style('display') === 'none' ? 'block' : 'none' });
		} else {
			elem = (this.getAttribute('class') || '').split(Hekate.regex.ws);
			value.split(Hekate.regex.ws).forEach(value => {
				const i = elem.indexOf(value);
				~i ? elem.splice(i, 1) : elem.push(value);
			});
			this.setAttribute('class', elem.join(' '));
		}
	});
};
