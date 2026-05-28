#! /usr/bin/env node

import fs			 from 'node:fs/promises';

import clear		 from './cli/helpers/clear.mjs';
import domain		 from './cli/helpers/domain.mjs';
import download		 from './cli/helpers/download.mjs';
import error		 from './cli/helpers/error.mjs';
import file			 from './cli/helpers/file.mjs';
import loading		 from './cli/helpers/loading.mjs';
import modules		 from './cli/helpers/modules.mjs';
import pid			 from './cli/helpers/pid.mjs';
import prompt		 from './cli/helpers/prompt.mjs';
import scaffold		 from './cli/helpers/scaffold.mjs';
import version		 from './cli/helpers/version.mjs';

import build		 from './cli/commands/build.mjs';
import help			 from './cli/commands/help.mjs';
import postinstall	 from './cli/commands/postinstall.mjs';
import restart		 from './cli/commands/restart.mjs';
import start		 from './cli/commands/start.mjs';
import stop			 from './cli/commands/stop.mjs';
import update		 from './cli/commands/update.mjs';

console.status = (text, color) => console.log(
	console.font('>', `-c ${color}`),
	console.font(':', 90),
	console.font(text, `-c ${color}`)
);
console.version = (prefix, local, remote) => [
	prefix,
	local ? console.font(local[0], local[1]) : '',
	remote ? console.font('⟶', 90) : '',
	remote ? console.font(remote[0], remote[1]) : ''
].join(' ');

class Server {

	constructor () {
		(async () => {
			this.root = process.argv[1].substring(0, process.argv[1].lastIndexOf('/'));
			this.opts = JSON.parse(await fs.readFile(`${this.root}/package.json`));
			this.root += '/apps';
			Object.keys(this.run).map(i => this.run[i] = this.run[i].bind(this));
			this.run[process.argv[2]] && await this.run[process.argv[2]]();
		})();
	};

	// ./cli/helpers
	clear = clear;
	domain = domain;
	download = download;
	error = error;
	file = file;
	loading = loading;
	modules = modules;
	pid = pid;
	prompt = prompt;
	scaffold = scaffold;
	version = version;

	// ./cli/commands
	run = {
		build,
		help,
		postinstall,
		restart,
		start,
		stop,
		update
	};

};

(async () => {
	await import('./server/primitive/array.js');
	await import('./server/primitive/date.js');
	await import('./server/console.js');
	new Server;
})();
