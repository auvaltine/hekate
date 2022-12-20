export default class Network {

	static RegExp = {
		byte: /[01]{8}/g
	};

	/**
	 * Converts a dot-notated IP address to its binary equivalent.
	 *
	 * @param {String} ip: The IP address to convert.
	 * @return {String} Returns a binary string matching the IP address.
	 */
	static ipToBin (ip) {
		return ip.split('.').map(i => (+i >>> 0).toString(2).padStart(8, 0)).join('');
	};

	/**
	 * Convert a binary number to its dot-notated IP address.
	 *
	 * @param {String} bin: The binary string to convert.
	 * @return {String} Returns an IP address.
	 */
	static binToIp (bin) {
		return bin.replace(Network.RegExp.byte, i => parseInt(i, 2) + '.').slice(0, -1);
	};

	/**
	 * Builds the network properties of a given IP address.
	 *
	 * @param {String} ip: The IP address to evaluate.
	 * @return {Network} Returns the IP's network properties.
	 */
	constructor (ip) {
		ip = ip.replace(/[^\/\d\.]/g, '').split('/');
		ip[0] = ip[0].split('.');
		ip[1] = +ip[1] || 32;
		const mask = '0'.repeat(ip[1]) + '1'.repeat(32 - ip[1]);
		const netw = '1'.repeat(ip[1]) + '0'.repeat(32 - ip[1]);
		this.HOST = ip[0].join('.');
		ip[2] = (this.HOST_MASK = Network.binToIp(mask)).split('.');
		this.HOST_MASK_LENGTH = 32 - ip[1];
		ip[3] = (this.NETWORK_MASK = Network.binToIp(netw)).split('.');
		this.NETWORK_MASK_LENGTH = ip[1];
		this.NETWORK_ADDRESS = ip[0].map((i, n) => +i & +ip[3][n]).join('.');
		this.BROADCAST_ADDRESS = Network.binToIp(Network.ipToBin(this.HOST).split('').map((i, n) => +i | +mask[n]).join(''));
		this.FIRST_ADDRESS = ip[1] === 32 || +ip[1] === 31 ? this.NETWORK_ADDRESS
			: this.NETWORK_ADDRESS.split('.').map((i, n) => +i | +(n === 3 )).join('.');
		this.LAST_ADDRESS = ip[1] === 32 ? this.NETWORK_ADDRESS
			: ip[1] === 31 ? this.BROADCAST_ADDRESS
			: this.BROADCAST_ADDRESS.split('.').map((i, n) => +i - +(n === 3)).join('.');
		Object.defineProperty(this, 'rangeStart', { value: parseInt(Network.ipToBin(this.FIRST_ADDRESS), 2) });
		Object.defineProperty(this, 'rangeEnd', { value: parseInt(Network.ipToBin(this.LAST_ADDRESS), 2) });
	};

	/**
	 * Check if the given IP address is in the network range.
	 *
	 * @param {String} ip: The IP address to search for.
	 * @return {Boolean} Returns true or false if the IP is in range.
	 */
	includes (ip) {
		ip = ip.replace(/[^\/\d\.]/g, '').split('/');
		ip = parseInt(Network.ipToBin(ip[0]), 2);
		return ip >= this.rangeStart && ip <= this.rangeEnd;
	};

};
