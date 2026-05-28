import child_process from 'node:child_process';
import util          from 'node:util';

export default {

    cwd: {},
	exec: util.promisify(child_process.exec),
	spawn: child_process.spawn

};