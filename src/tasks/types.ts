export enum Task {
	BAKE_TAGS = 'BAKE_TAGS',
	BAKE_RATINGS = 'BAKE_RATINGS',
	RESTORE_RATINGS = 'RESTORE_RATINGS',
	RESTORE_BACKUPS = 'RESTORE_BACKUPS',
	REMOVE_BACKUPS = 'REMOVE_BACKUPS',
}

export interface TaskConfig {
	dryRun: boolean,
	presetsDir: string,
	dbPath: string,
}
export type TaskFn = (config:TaskConfig)=>Promise<void>