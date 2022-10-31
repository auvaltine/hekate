Object.defineProperties(Number, {
	random: { value: function random (min, max) {
		const dec = Math.max.apply(null, [
			((min + '').split('.')[1] || '').length,
			((max + '').split('.')[1] || '').length
		]);
		min = Number.parseFloat((+min).toFixed(dec));
		max = Number.parseFloat((+max).toFixed(dec));
		return Number.parseFloat((Math.random() * (max - min) + min).toFixed(dec));
	}}
});
Object.defineProperties(Number.prototype, {
	isLuhn: { value: function isLuhn () {
		const num = this + '';
		const len = num.length;
		const par = len % 2;
		let sum = 0;
		for (let i = len - 1; i >= 0; i--) {
			let d = parseInt(num.charAt(i));
			if (i % 2 == par) { d *= 2; }
			if (d > 9) { d -= 9; }
			sum += d;
		}
		return !(sum % 10);
	}},
	toOrdinal: { value: function toOrdinal () {
		const j = this % 10;
		const k = this % 100;
		return this + (
			  j === 1 && k !== 11 ? 'st'
			: j === 2 && k !== 12 ? 'nd'
			: j === 3 && k !== 13 ? 'rd'
			: 'th'
		);
	}},
	toString: { value: (() => {
		const toString = Number.prototype.toString;
		return function (format) {
			let number = this;
			if (!format) {
				return '' + number;
			} else if (typeof format === 'number') {
				return toString.call(number, format);
			} else {
				if (typeof format === 'function') {
					format = format(number) || [];
					number = format[0] || 0;
					format = format[1] || '';
				}
				format = `${format || ''}`.match(/^([^0]+)?(.*?)(?:\[([^\[\]\0]+)\](0+))?([^0]+)?$/);
				const arr = [];
				const val = number.toFixed(2).split('.')[0].split('');
				format[2].split('').reverse().every(i => val.length && arr.push(i === '0' ? val.pop() : i));
				return ((format[1] || '') + arr.reverse().join('')
					  + (format[3] && format[4] ? format[3] + number.toFixed(format[4].length).split('.').pop() : '')
					  + (format[5] || '')).trim();
			}
		};
	})()}
});
