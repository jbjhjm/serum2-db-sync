import * as fs from 'fs/promises';
import {existsSync} from 'fs';
import { glob } from 'glob';
import * as path from 'path';

export namespace Backup {
	export async function create(filepath:string, backupSuffix = '.backup') {
		const backupPath = filepath + backupSuffix;
		if(existsSync(backupPath)) await fs.unlink(backupPath);
		await fs.copyFile(filepath, backupPath);
		return backupPath;
	}
	export async function restore(filepath:string, backupSuffix = '.backup') {
		let originalPath:string;
		let backupPath:string;
		if(filepath.endsWith(backupSuffix)) {
			backupPath = filepath;
			originalPath = filepath.replace(backupSuffix,'')
		} else {
			originalPath = filepath;
			backupPath = filepath+backupSuffix;
		}
		if(existsSync(originalPath))  await fs.unlink(originalPath);
		await fs.copyFile(backupPath, originalPath);
	}
}