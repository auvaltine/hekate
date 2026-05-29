import fs from 'node:fs/promises';

/**
 * Synchronously checks if a file exists.
 *
 * @param {String} file The file location.
 * @return {Boolean} Returns true if the file exists, or false.
 */
export default async function file (file) {

	try {
		await fs.access(file);
		return true;
	} catch (e) {
		return false;
	}

};
