export default {

	domain: /^(?:[a-z\d\-ßàÁâãóôþüúðæåïçèõöÿýòäœêëìíøùîûñé]+\.)*[a-z\d]+(?::\d+)?$/i, // valid domain
	ipv4: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/, // ipv4 check
	pathname: /\/apps\/.+\/content\/modules\/((?:client|server)\/([^\/]+))\/\2\.js$/, // module name from path
	prompt: /^(y(?:es)?|n(?:o)?)$/i, // prompt stdin
	ready: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z Ready \\(PID:', // ready notice
	version: /v((\d(?:\.\d+){0,2})(?:-(alpha|beta|nightly)(?:\+\d+)?)?)(?:\s|\*|$)/, // version
	fversion: /^\/\*! (@(?:client|server)\/(?:[a-z0-9\.]+)) v(\d+(?:\.\d+){0,2}(?:-(?:alpha|beta|nightly)(?:\+\d+)?)?) /, // version from file
	fdependencies: /^\/\*! dependencies: ([@\/a-z0-9\.,]+)/ // dependencies from file

};