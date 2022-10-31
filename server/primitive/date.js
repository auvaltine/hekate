Object.defineProperties(Date, {
	setInterval: { value: function setInterval (...i) {
		Object.defineProperty(this, 'interval', { value: true });
		return Date.setTimeout.apply(this, i);
	}},
	setTask: { value: (() => {
		const rx = {
			split: /\s+/,
			interval: /^(?:(\*|\d+)(?:\/(\d+))?|(\d+)-(\d+)(?:\/(\d+))?|(\d+(?:,\d+)*))$/,
			months: /\b(jan(?:uary)?)(feb(?:ruary)?)?(mar(?:ch)?)?(apr(?:il)?)?(may)?(june?)?(july?)?(aug(?:ust)?)?(sep(?:tember)?)?(oct(?:ober)?)?(nov(?:ember)?)?(dec(?:ember)?)?\b/gi,
			days: /\b(sun(?:day)?)?(mon(?:day)?)?(tue(?:sday)?)?(wed(?:nesday)?)?(thu(?:rsday)?)?(fri(?:day)?)?(sat(?:urday)?)?\b/gi
		};
		const tick = () => /* Run the ticker every minute */ {
			const tick = new Date();
			tick.setMilliseconds(0);
			tick.setSeconds(0);
			tick.setMinutes(tick.getMinutes() + 1);
			return tick;
		};
		return function setTask (expr, fn = () => {}, runtime = false) {
			expr = expr.trim().split(rx.split).map((k, n, m) => {
				let r;
				switch (n) {
					case 0: /* minutes of hour 0-59 */ r = [ 0, 59 ]; break;
					case 1: /* hours of day 0-23 */ r = [ 0, 23 ]; break;
					case 2: /* days of month 1-31 */ r = [ 1, 31 ]; break;
					case 3: /* months of year */ {
						k = k.replace(rx.months, (...i) => ~(i = i.slice(1, 13).findIndex(Boolean)) ? i + 1 : '');
						r = [ 1, 12 ];
						break;
					}
					case 4: /* days of week */ {
						k = k.replace(rx.days, (...i) => ~(i = i.slice(1, 8).findIndex(Boolean)) ? i : '');
						r = [ 0, 6 ];
						break;
					}
				}
				n = [];
				if ((m = k.match(rx.interval))) {
					m = m.slice(1);
					if (m[0] !== undefined) { // #/#
						m = m.slice(0, 2);
						if (m[2] === undefined) {
							if (m[0] === '*') {
								for (let i = r[0]; i <= r[1]; i++) {
									n.push(i);
								}
							} else n.push(+m[0]);
						} else for (let i = m[0] === '*' ? r[0] : +m[0]; i <= r[1]; i += +m[1]) {
							n.push(i);
						}
					} else if (m[2] !== undefined) { // #-#/#
						m = m.slice(2, 5);
						for (let i = +m[0]; i <= m[1]; i += m[2] === undefined ? 1 : +m[2]) {
							n.push(i);
						}
					} else if (m[5] !== undefined) { // #,#
						n = m[5].split(',').map(i => +i);
					}
				} else for (let i = r[0]; i <= r[1]; i++) { // #
					n.push(i);
				}
				return n;
			});
			runtime && fn();
			Object.defineProperty(this, 'interval', { value: true });
			return Date.setTimeout.call(this, () => {
				const date = new Date();
				expr[0].includes(date.getMinutes()) &&
				expr[1].includes(date.getHours()) &&
				expr[2].includes(date.getDate()) &&
				expr[3].includes(date.getMonth()) &&
				expr[4].includes(date.getDay()) &&
				fn();
			}, tick);
		}
	})() },
	setTimeout: { value: function setTimeout (...i) {
		let timer;
		if (typeof i[0] !== 'function') {
			i.splice(1, 0, i[0]);
			i[0] = () => {};
		}
		function date () {
			return i[1] instanceof Date ? i[1]
				: typeof i[1] === 'function' ? i[1]()
				: typeof i[1] === 'number' ? new Date(Date.now() + i[1])
				: typeof i[1] === 'string' ? new Date(i[1])
				: null;
		}
		const keep = this.interval;
		const time = new Promise(resolve => (function limit () {
			const max = Math.max(date() - new Date(), 0);
			timer = max > 0x7FFFFFFF ? global.setTimeout(limit, 0x7FFFFFFF) : global.setTimeout(() => {
				time.end();
				resolve(keep ? limit() : undefined);
			}, max);
		})());
		Object.defineProperties(time, {
			end:  { value: function end  () { global.clearTimeout(timer) || i[0](...i) }},
			stop: { value: function stop () { global.clearTimeout(timer) }},
			date: { value: date}
		});
		return time;
	}}
});
Object.defineProperties(Date.prototype, {
	toString: { value: function toString (string) {
		const zone  = this.getTimezoneOffset() / 60;
		const day   = this.getDay();
		const date  = this.getDate();
		const hours = this.getHours();
		const month = this.getMonth();
		const year  = this.getFullYear();
		string = string || '%D %M %d %Y %H:%i:%s GMT%P (%T)';
		return ('' + string).replace(/%([a-z])/gi, (...i) => {
			switch (i[1]) {
				case 'd': { return ('00' + date).substr(-2); }
				case 'D': { return this.toLocaleString('en', { weekday: 'short' }); }
				case 'j': { return date; }
				case 'l': { return this.toLocaleString('en', { weekday: 'long' }); }
				case 'N': { return day + 1; }
				case 'S': { return date.toOrdinal(); }
				case 'w': { return day; }
				case 'z': {
					const start = new Date(year, 0, 0);
					return Math.floor(((this - start) + ((start.getTimezoneOffset() - this.getTimezoneOffset()) * 60000)) / 86400000);
				}
				case 'W': {
					const UTC = new Date(Date.UTC(year, month, date));
					UTC.setUTCDate(UTC.getUTCDate() + 4 - (UTC.getUTCDay() || 7));
					const start = new Date(Date.UTC(UTC.getUTCFullYear(), 0, 1));
					return Math.ceil((((UTC - start) / 86400000) + 1) / 7);
				}
				case 'F': { return this.toLocaleString('en', { month: 'long' }); }
				case 'm': { return ('00' + (month + 1)).substr(-2); }
				case 'M': { return this.toLocaleString('en', { month: 'short' }); }
				case 'n': { return month; }
				case 't': { return new Date(year, month + 1, 0).getDate(); }
				case 'L': { return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0); }
				/** ::TODO:: */ // case 'o': { return match; }
				case 'Y': { return year; }
				case 'y': { return ('' + year).substr(-2); }
				case 'a': { return hours < 12 ? 'am' : 'pm'; }
				case 'A': { return hours < 12 ? 'AM' : 'PM'; }
				/** ::TODO:: */ // case 'B': { return match; }
				case 'g': { return hours > 12 ? hours - 12 : hours ? hours : 12; }
				case 'G': { return hours; }
				case 'h': { return ('00' + (hours > 12 ? hours - 12 : hours)).substr(-2); }
				case 'H': { return ('00' + hours).substr(-2); }
				case 'i': { return ('00' + this.getMinutes()).substr(-2); }
				case 's': { return ('00' + this.getSeconds()).substr(-2); }
				case 'u': { return ('' + this.getMilliseconds()).padEnd(3, '0'); }
				case 'e': { return this.toLocaleString('en', { timeZoneName: 'long' }).match(/\d [AP]M (.+)$/)[1]; }
				case 'I': {
					return this.getTimezoneOffset() < Math.max(
						new Date(year, 0, 1).getTimezoneOffset(),
						new Date(year, 6, 1).getTimezoneOffset()
					);
				}
				case 'O': { return (zone <= 0 ? '+' : '-') + ('' + zone).padStart(4, '0'); }
				case 'P': { return (zone <= 0 ? '+' : '-')
					+ ('' + zone).padStart(2, '0') + ':'
					+ ('' + (zone * 1000)).padStart(2, '0').substr(-2); }
				case 'T': { return this.toLocaleString('en', { timeZoneName: 'short' }).match(/\d [AP]M (.+)$/)[1]; }
				case 'Z': { return zone * 60 * 60; }
				case 'c': { return this.toString('%Y-%m-%dT%H:%i:%s.%uZ'); }
				case 'r': { return this.toString('%D, %j %M %Y %H:%i:%s %O'); }
				case 'U': { return (new Date()).getMilliseconds(); }
				default: { return i[0]; }
			}
		});
	}}
});
