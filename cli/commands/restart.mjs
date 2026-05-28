/**
 * Restarts a server.
 *
 * @return {undefined}
 */
export default async function restart () {

	await this.run.stop();
	await this.run.start();

};