import regexp from '../constants/regexp.mjs';

/**
 * Builds a domain from its hostname and port.
 *
 * @param {String} host Used as the source host, or read from the directory or process argument.
 * @return {Array} Returns a domain split by hostname and port number.
 */
export default function domain (host) {

    host = [ !host && process.argv[3]
        ? process.argv[3].split(':') // host & port determined from argument
        : (host || process.cwd()) // host & port determined from directory
            .substring(this.root.length + 1).split('/')
            .map((i, n) => n || regexp.ipv4.test(i) ? i : i.split('.').reverse().join('.'))
        ]
        .flat()
        .concat([ '' ])
        .map((i, n) => n === 1 ? (i && i != 80 ? +i : 80) : i)
        .slice(0, 2);
    host.path = regexp.ipv4.test(host[0]) ? host[0] : host[0].split('.').reverse().join('.');
    host.path = `${this.root}/${host.path}${host[1] === 80 ? '' : '/' + host[1]}`;
    host.name = host[1] === 80 ? host[0] : host.join(':');
    if (regexp.domain.test(host.name)) {
        return host;
    } else {
        this.error('Invalid host name', host.name);
    }

};