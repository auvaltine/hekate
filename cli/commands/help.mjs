/**
 * Prints command usage and domain path examples.
 *
 * @return {undefined}
 */
export default async function help () {

	console.log([
		'',
		console.font('hekate.js', 35),
		'',
		console.font('Usage:', 33),
		'  npm start <domain>',
		'  npm stop <domain>',
		'  npm run restart <domain>',
		'  npm run help',
		'',
		console.font('Apps:', 33),
		'  npm start asks to build a domain when no app exists.',
		'',
		console.font('Domains:', 33),
		'  hekatejs.com      -> apps/com/hekatejs',
		'  hekatejs.com:3000 -> apps/com/hekatejs/3000',
		'  localhost:3000    -> apps/localhost/3000',
		'  127.0.0.1         -> apps/127.0.0.1',
		'',
		console.font('Advanced:', 33),
		'  npm run build <domain>',
		'  npm run update',
		'  npm run update <domain>',
		''
	].join('\n'));

};