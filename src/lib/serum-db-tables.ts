export enum S2DbTable {
	Locations = 'Locations',
	UserData = 'UserData',
	Tags = 'Tags',
	Presets = 'Presets',
	Presets_Tags = 'Presets_Tags',
}

export interface S2Entities {
	[S2DbTable.Locations]: {
		location_id:number;
		location:string;
	},
	[S2DbTable.UserData]: {
		hash:string;
		rating:number;
	},
	[S2DbTable.Tags]: {
		tag_id:number;
		name:string;
	},
	[S2DbTable.Presets_Tags]: {
		tag_id:number;
		preset_id:number;
	},
	[S2DbTable.Presets]: {
		preset_id: number,
		comment: string,
		date_added: number,
		date_modified: number,
		author: string,
		category: string,
		description: string,
		file_ext: 'SerumPreset'|string,
		hash: string,
		location_id: number,
		name: string
	},
}

export type S2EntityLocation = S2Entities[S2DbTable.Locations];
export type S2EntityUserData = S2Entities[S2DbTable.UserData];
export type S2EntityTag = S2Entities[S2DbTable.Tags];
export type S2EntityPresetTag = S2Entities[S2DbTable.Presets_Tags];
export type S2EntityPreset = S2Entities[S2DbTable.Presets];
