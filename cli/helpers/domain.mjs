import regexp from '../constants/regexp.mjs';

/**
 * Builds a domain from its hostname and port.
 *
 * @param {String} host Used as the source host, or read from the directory or process argument.
 * @return {Array} Returns a domain split by hostname and port number.
 */
export default function domain (host) {

	const fromName = name => {
		const host = name.split(':').concat([ '' ]).slice(0, 2);
		host[1] = host[1] && host[1] != 80 ? +host[1] : 80;
		host.path = regexp.ipv4.test(host[0]) ? host[0] : host[0].split('.').reverse().join('/');
		host.path = `${this.root}/${host.path}${host[1] === 80 ? '' : '/' + host[1]}`;
		host.name = host[1] === 80 ? host[0] : host.join(':');
		return host;
	};
	const fromPath = path => {
		const dirs = path.substring(this.root.length + 1).split('/').filter(Boolean);
		const port = /^\d+$/.test(dirs[dirs.length - 1]) ? +dirs.pop() : 80;
		const name = regexp.ipv4.test(dirs[0]) ? dirs[0] : dirs.reverse().join('.');
		const host = [ name, port ];
		host.path = `${this.root}/${path.substring(this.root.length + 1).replace(/\/$/, '')}`;
		host.name = port === 80 ? name : host.join(':');
		return host;
	};
	host = !host && process.argv[3]
		? fromName(process.argv[3])
		: host && host.indexOf(this.root) !== 0
			? fromName(host)
			: fromPath(host || process.cwd());
	if (regexp.domain.test(host.name)) {
		return host;
	} else {
		this.error('Invalid host name', host.name);
	}

};
