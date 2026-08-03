import { input, select } from '@inquirer/prompts';
import * as fs from 'fs/promises';
import {existsSync} from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { homedir } from 'os';
import { Task, type TaskFn } from './tasks/types.js';
import { Globals } from './lib/globals.js';
import { Command } from 'commander';
import { Backup } from './lib/backup.js';
import { Logger } from './lib/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const userHomeDir = homedir();
const program = new Command();
program.option('--inputPath <string>', 'inputPath');
program.option('--task <string>', 'task');
program.option('--dryRun', 'dryRun');
program.parse(process.argv);
const opts = program.opts();
console.log(opts)

const inputPath = await (async ()=>{
	if(opts.inputPath) return opts.inputPath;
	return input({ 
		message: 'Please point to your "Serum Presets" directory.', 
		default: path.join(userHomeDir,'Documents/Xfer/Serum 2 Presets')
	});
})()

const task = await (async ()=>{
	if(opts.task) return opts.task;
	return select<string>({ message:'Select the task to run', choices:[
		{ value:Task.BAKE_TAGS, name:'Save own tags into preset files'},
		{ value:Task.BAKE_RATINGS, name:'Save ratings into preset files (as tags e.g. "Rate:X")'},
		{ value:Task.RESTORE_RATINGS, name:'Restore ratings from preset files ', description:'(requires they have been written into tags before)'},
		{ value:Task.RESTORE_BACKUPS, name:'Restore preset backups', description:'(useful in case an operation created corrupt preset files.)'},
		{ value:Task.REMOVE_BACKUPS, name:'Remove preset backups', description:'After successful operation, you may want to remove backups.'},
	]})
})()

const dryRun = await (async ()=>{
	if(typeof opts.dryRun === 'boolean') return opts.dryRun;
	return (await input({ message: 'Simulate without changing anything?', default:'y' })) === 'y'
})()


const dirContents = await fs.readdir(inputPath);
if(!dirContents.includes('Presets') || !dirContents.includes('System')) {
	throw new Error('Invalid input path detected. Please point to the "Serum Presets" directory. It contains many subdirectorys like Presets, System, Noises, Effect Chains etc.')
}
const presetsDir = path.join(inputPath, 'Presets');
const systemDir = path.join(inputPath, 'System');
const dbFilePath = path.join(systemDir, 'presets.db');
const systemDirContents = await fs.readdir(systemDir);
if(systemDirContents.includes('presets.db-shm') || systemDirContents.includes('presets.db-wal')) {
	throw new Error('It seems the database is currently being in use (temporary db-shm/db-wal files found). Please close all Serum instances and retry.')
}



console.log('cloning database...')
const dbCopyFilePath = await Backup.create(dbFilePath, Globals.FileExt)
if(existsSync(dbCopyFilePath+'-wal')) await fs.unlink(dbCopyFilePath+'-wal');
if(existsSync(dbCopyFilePath+'-shm')) await fs.unlink(dbCopyFilePath+'-shm');


const taskFilePath = './tasks/' + task + '.ts';
const resolved = path.resolve(__dirname, taskFilePath);
if(!existsSync(resolved)) Logger.fatal('Task not found: '+task)
const taskHandler = (await import(taskFilePath).then(mod=>mod.default)) as TaskFn;

await taskHandler({
	dryRun,
	presetsDir,
	dbPath: dbCopyFilePath,
})

console.log('completed.')