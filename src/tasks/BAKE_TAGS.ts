import { diff } from "fast-array-diff";
import { existsSync } from 'fs';
import * as path from 'path';
import { Logger } from '../lib/logger.js';
import { SerumDbUtils } from '../lib/serum-db-utils.js';
import { SerumPresetPackager } from '../lib/serum-preset-packager.js';
import { SQLConnector } from '../lib/sqlite.js';
import type { TaskConfig, TaskFn } from './types.js';
import { Backup } from '../lib/backup.js';
import { writeFile } from 'fs/promises';

// it seems that serum will add some tags on the fly. 
const autoAddedTags = [ 'Preview', 'S2', 'Poly', 'Multisample', 'SerumFX' ];

function getPresetPath(config: TaskConfig, preset: SerumDbUtils.S2EntityPresetWithJoins):string|null {
	const presetFilePath = path.join(
		config.presetsDir,
		preset.location,
		preset.name + '.' + preset.file_ext
	);
	if (!existsSync(presetFilePath)) {
		Logger.error('Skipping Preset because file was not found: ' + presetFilePath);
		return null
	}
	return presetFilePath;
}

async function bakePresetTags(presetPath:string, newTags:string[], dryRun:boolean) {
	try {
		const data = await SerumPresetPackager.unpack(presetPath)
		
		const persistedTags = data.metadata.tags.filter(t=>!autoAddedTags.includes(t))
		newTags = newTags.filter(t=>!autoAddedTags.includes(t))
		newTags.sort();
		persistedTags.sort();

		const changes = diff(persistedTags, newTags);
		if(changes.added.length || changes.removed.length) {
			// Logger.log('Found tags that need to be updated in '+presetPath)
			// console.log(persistedTags, 'should be: ', newTags, 'changes:', changes)
			data.metadata.tags = [...newTags]
			const buffer = await SerumPresetPackager.pack(data)
			if(!dryRun) {
				await Backup.create(presetPath);
				await writeFile(presetPath, buffer)
				Logger.success('Updated tags of '+presetPath)
			} else {
				Logger.success('[Simulated] Updated tags of ' + presetPath )
			}
		} else {
			// Logger.log('Preset file is up to date.')
		}
	} catch (err) {
		Logger.error('Failed to bake preset tags into '+presetPath+': '+err)
	}
	// await SerumPresetPackager.pack(data, 'output.SerumPreset')
	
}

export default <TaskFn>async function BAKE_TAGS(config:TaskConfig) {
	Logger.log('executing task BAKE_TAGS - '+(config.dryRun ? 'Simulating (dry-run) only' : 'With saving changes'))
	const presetDB = new SQLConnector();
	await presetDB.connect(config.dbPath);

	const locationMap = await SerumDbUtils.getAllLocations(presetDB);
	const tagsMap = await SerumDbUtils.getAllTags(presetDB);

	/**
	 * unfortunately the database does not provide any way to find presets with new tags or ratings.
	 * The only way would be to keep a database snapshot from last processing and do a data diff.
	 * But likely its easier to just handle all presets.
	 */
	const chunkSize = 100;
	let chunkNum = 0;
	for await (const chunk of SerumDbUtils.scanPresets(presetDB, null, chunkSize)) {
		Logger.log(`Processing presets ${chunkNum*chunkSize}-${((chunkNum+1)*chunkSize)-1}`)
		let numIncompatible = 0;
		for(const preset of chunk) {
			const tagIds = preset.tag_ids.split(',').map(id=>parseInt(id,10));
			const tagNames = tagIds.map(id=>tagsMap.get(id).name);
			const presetFilePath = getPresetPath(config, preset);
			if(!presetFilePath) continue;
			if(!presetFilePath.endsWith('SerumPreset')) {
				numIncompatible++;
				continue;
			}
			await bakePresetTags(presetFilePath, tagNames, config.dryRun)
		}
		if(numIncompatible>0) {
			Logger.warn('Skipped '+numIncompatible+' incompatible preset, likely legacy .fxp presets.');
		}
		chunkNum++;
	}

}
