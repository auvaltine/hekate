import semver from 'semver';

/**
 * Determines version differences between local and remote modules.
 *
 * @param {Object} l The local version of a module.
 * @param {Object} r The remote version of a module.
 * @return {Object|undefined} Returns the remote version if it's going to be updated.
 */
export default async function version (l, r) {

	const name = `${console.font(`<${l.host ? l.host.name : 'hekate.js'}>`, 90)} ${l.name}:`;
	  let file;
	l.version === r.version
		? console.log(console.version(name, [ l.version, 32 ]) ) // Local and remote versions are identical.
		: semver.satisfies(...(semver.lt(l.version, r.version)
			? [ r.version, `^${l.version}` ] // local is older
			: [ l.version, `^${r.version}` ] // local is newer (?)
		))
		? (file = l) && console.log(console.version(name, // Local and remote versions are compatible.
			[ l.version, semver.eq(l.version, r.version) || semver.lt(l.version, r.version) ? 33 : 32 ], // local is older
			[ r.version, semver.eq(l.version, r.version) || semver.lt(l.version, r.version) ? 32 : 33 ]  // local is newer
		))
		// Local version is incompatible with remote version, confirm update.
		: await this.prompt(console.version(name, [ l.version, 31 ], [ r.version, 32 ])) && (file = l);
	return file;

};
