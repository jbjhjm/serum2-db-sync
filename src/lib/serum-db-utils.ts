import { S2DbTable, type S2EntityLocation, type S2EntityPreset, type S2EntityTag } from './serum-db-tables.js';
import type { SQLConnector } from './sqlite.js';

export namespace SerumDbUtils {
	export async function getAllLocations(connection:SQLConnector) {
		const locations = await connection.db.all<S2EntityLocation[]>(`SELECT * FROM ${S2DbTable.Locations}`);
		const locationMap = new Map<number, S2EntityLocation>();
		locations.forEach(loc => locationMap.set(loc.location_id, loc));
		return locationMap;
	}
	export async function getAllTags(connection:SQLConnector) {
		const tags = await connection.db.all<S2EntityTag[]>(`SELECT * FROM ${S2DbTable.Tags}`);
		const tagsMap = new Map<number, S2EntityTag>();
		tags.forEach(tag => tagsMap.set(tag.tag_id, tag));
		return tagsMap
	}

	export type S2EntityPresetWithJoins = S2EntityPreset & {
		tag_ids:string,
		location:string,
		rating:number|null,
	}

	export async function* scanPresets(
		dbConnection:SQLConnector, 
		where:string|null=null, 
		chunkSize = 5,
		abortAt = 0
	): 
		AsyncGenerator<S2EntityPresetWithJoins[], void, void>
	{
		let offset = 0;
		let presets:any[];
		do {
			const query = `
				SELECT 
					${S2DbTable.Presets}.* ,
					${S2DbTable.UserData}.rating ,
					${S2DbTable.Locations}.location ,
					GROUP_CONCAT(${S2DbTable.Presets_Tags}.tag_id, ',') AS tag_ids
				FROM ${S2DbTable.Presets} 
				LEFT JOIN ${S2DbTable.Presets_Tags} ON ${S2DbTable.Presets_Tags}.preset_id = ${S2DbTable.Presets}.preset_id
				LEFT JOIN ${S2DbTable.UserData} ON ${S2DbTable.UserData}.hash = ${S2DbTable.Presets}.hash
				LEFT JOIN ${S2DbTable.Locations} ON ${S2DbTable.Locations}.location_id = ${S2DbTable.Presets}.location_id
				${where!==null ? 'WHERE '+where : ''}
				GROUP BY ${S2DbTable.Presets}.preset_id
				LIMIT ${chunkSize} OFFSET ${offset}
			`;

			presets = presets = await dbConnection.db.all<S2EntityPresetWithJoins[]>(query)
	
			yield presets;
			offset += chunkSize;
	
		} while(
			presets 
			&& presets.length > 0
			&& (abortAt === 0 || abortAt > offset)
		)
	}
}