Object.defineProperties(Array.prototype, {
	random: { value: function random () {
		const random = this;
		for (let i = random.length - 1; i > 0; i--) {
			const r = Number.random(0, i);
			const s = random[i];
			random[i] = random[r];
			random[r] = s;
		}
		return random;
	}},
	sum: { value: function sum () { return this.length ? this.reduce((a, b) => +a + +b) : 0; }},
	unique: { value: function unique () {
		return this.filter((value, index, self) => self.indexOf(value) === index);
	}}
});
