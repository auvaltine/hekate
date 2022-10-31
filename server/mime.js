const Mime = {
	'RegExp': {
		'utf8': /^(?:application\/(?:(?:atom|rss|xhtml)\+xml|(?:ld\+)?json)|image\/svg\+xml|text\/(?:cs[sv]|calendar|html|javascript|plain|x-component|xml))$/
	},
	'Type': {
		'application/atom+xml': [ 'atom' ],
		'application/epub+zip': [ 'epub' ],
		'application/gzip': [ 'gz' ],
		'application/java-archive': [ 'ear', 'jar', 'war' ],
		'application/json': [ 'json' ],
		'application/ld+json': [ 'jsonld' ],
		'application/mac-binhex40': [ 'hqx' ],
		'application/msword': [ 'doc' ],
		'application/octet-stream': [ 'bin' ],
		'application/ogg': [ 'ogx' ],
		'application/pdf': [ 'pdf' ],
		'application/postscript': [ 'ai', 'eps', 'ps' ],
		'application/rss+xml': [ 'rss' ],
		'application/rtf': [ 'rtf' ],
		'application/vnd.amazon.ebook': [ 'azw' ],
		'application/vnd.apple.installer+xml': [ 'mpkg' ],
		'application/vnd.google-earth.kml+xml': [ 'kml' ],
		'application/vnd.google-earth.kmz': [ 'kmz' ],
		'application/vnd.mozilla.xul+xml': [ 'xul' ],
		'application/vnd.ms-excel': [ 'xls' ],
		'application/vnd.ms-fontobject': [ 'eot' ],
		'application/vnd.ms-powerpoint': [ 'ppt' ],
		'application/vnd.oasis.opendocument.presentation': [ 'odp' ],
		'application/vnd.oasis.opendocument.spreadsheet': [ 'ods' ],
		'application/vnd.oasis.opendocument.text': [ 'odt' ],
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': [ 'pptx' ],
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [ 'xlsx' ],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [ 'docx' ],
		'application/vnd.rar': [ 'rar' ],
		'application/vnd.visio': [ 'vsd' ],
		'application/vnd.wap.wmlc': [ 'wmlc' ],
		'application/x-7z-compressed': [ '7z' ],
		'application/x-abiword': [ 'abw' ],
		'application/x-bzip': [ 'bz' ],
		'application/x-bzip2': [ 'bz2' ],
		'application/x-cdf': [ 'cda' ],
		'application/x-cocoa': [ 'cco' ],
		'application/x-csh': [ 'csh' ],
		'application/x-freearc': [ 'arc' ],
		'application/x-makeself': [ 'run' ],
		'application/x-httpd-php': [ 'php' ],
		'application/x-java-archive-diff': [ 'jardiff' ],
		'application/x-java-jnlp-file': [ 'jnlp' ],
		'application/x-perl': [ 'pl', 'pm' ],
		'application/x-pilot': [ 'prc', 'pdb' ],
		'application/x-redhat-package-manager': [ 'rpm' ],
		'application/x-sea': [ 'sea' ],
		'application/x-sh': [ 'sh' ],
		'application/x-shockwave-flash': [ 'swf' ],
		'application/x-stuffit': [ 'sit' ],
		'application/x-tar': [ 'tar' ],
		'application/x-tcl': [ 'tcl|tk' ],
		'application/x-x509-ca-cert': [ 'crt', 'der', 'pem' ],
		'application/x-xpinstall': [ 'xpi' ],
		'application/xhtml+xml': [ 'xhtml' ],
		'application/zip': [ 'zip' ],
		'audio/aac': [ 'aac' ],
		'audio/m4a': [ 'm4a' ],
		'audio/midi': [ 'mid', 'midi', 'kar' ],
		'audio/mpeg': [ 'mp3' ],
		'audio/ogg': [ 'ogg', 'oga' ],
		'audio/wav': [ 'wav' ],
		'audio/webm': [ 'weba' ],
		'audio/x-realaudio': [ 'ra' ],
		'image/avif': [ 'avif' ],
		'image/bmp': [ 'bmp' ],
		'image/gif': [ 'gif' ],
		'image/jpeg': [ 'jpg', 'jpeg' ],
		'image/png': [ 'png' ],
		'image/svg+xml': [ 'svg', 'svgz' ],
		'image/tiff': [ 'tif', 'tiff' ],
		'image/vnd.microsoft.icon': [ 'ico' ],
		'image/vnd.wap.wbmp': [ 'wbmp' ],
		'image/x-icon': [ 'ico' ],
		'image/x-jng': [ 'jng' ],
		'image/webp': [ 'webp' ],
		'font/otf': [ 'otf' ],
		'font/ttf': [ 'ttf' ],
		'font/woff': [ 'woff' ],
		'font/woff2': [ 'woff2' ],
		'text/calendar': [ 'ics' ],
		'text/css': [ 'css', 'scss' ],
		'text/csv': [ 'csv' ],
		'text/html': [ 'html', 'htm', 'shtml' ],
		'text/javascript': [ 'js', 'mjs' ],
		'text/plain': [ 'txt' ],
		'text/markdown': [ 'md' ],
		'text/mathml': [ 'mml' ],
		'text/vnd.sun.j2me.app-descriptor': [ 'jad' ],
		'text/vnd.wap.wml': [ 'wml' ],
		'text/x-component': [ 'htc' ],
		'text/xml': [ 'xml' ],
		'video/3gpp': [ '3g2', '3gp', '3gpp' ],
		'video/m4v': [ 'm4v' ],
		'video/mp2t': [ 'ts' ],
		'video/mp4': [ 'mp4' ],
		'video/mpeg': [ 'mpg', 'mpeg' ],
		'video/ogg': [ 'ogv' ],
		'video/quicktime': [ 'mov' ],
		'video/x-flv': [ 'flv' ],
		'video/x-mng': [ 'mng' ],
		'video/x-ms-asf': [ 'asx' ],
		'video/x-ms-wmv': [ 'asf' ],
		'video/x-msvideo': [ 'avi' ],
		'video/webm': [ 'webm' ]
	}
};

export default {

	/**
	 * Determines if a given type should have a UTF-8 character set.
	 *
	 * @param {String} type The MIME type to test.
	 * @return {String} Returns a UTF-8 charset to attach, or an <empty string>.
	 */
	Charset (type) {
		return Mime.RegExp.utf8.test(type) ? '; charset=utf-8' : '';
	},

	/**
	 * Gets the first matching file type for a given MIME type.
	 *
	 * @param {String} type The MIME type.
	 * @return {String|undefined} Returns the file type or undefined if no MIME type was found.
	 */
	Extension (type) {
		return (Mime.Type[type] || [])[0];
	},

	/**
	 * Gets the MIME type for a file.
	 *
	 * @param {String} path The fully-qualified path, or simply a file extension.
	 * @return {String} Returns the MIME type, default to <application/octet-stream>.
	 */
	Type (path) {
		const type = path.substring(path.lastIndexOf('.') + 1);
		return (Object.entries(Mime.Type).find(i => i[1].includes(type)) || [ 'application/octet-stream' ])[0];
	}

};
