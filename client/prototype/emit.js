Hekate.prototype.emit = function (event, data) {
	event = event.replace(Hekate.regex.trim, ' ').split(Hekate.regex.ws);
	return this.each(function () {
		for (let i of event) {
			typeof this[i] === 'function'
				 ? this[i]()
				 : this.dispatchEvent(new CustomEvent(i.split('.')[0], {
					bubbles: true,
					detail: data,
					target: this
				 }));
		}
	});
};
