Hekate.serialize = function (form) {
	const data = new FormData();
	new Hekate(':input', form).each(function (i, name) {
		if ((name = this.name)) {
			switch (this.type) {
				case 'file': new Hekate(this.files).each(function () { data.append(name, this); }); break;
				case 'checkbox':
				case 'radio': this.checked && data.append(name, this.value); break;
				default: data.append(name, this.value); break;
			}
		}
	});
	return data;
};
