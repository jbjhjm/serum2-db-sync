import sqlite3 from 'sqlite3'
import { open, type Database } from 'sqlite'
import { Logger } from './logger.js';
import { S2DbTable } from './serum-db-tables.js';


export class SQLConnector {

	private _db: Database<sqlite3.Database, sqlite3.Statement>;
	get db():Database<sqlite3.Database, sqlite3.Statement> {
		if(!this._db) throw new Error('Tried to access db before connecting!');
		return this._db
	}

	constructor(private opts:{verbose?:boolean}={}) {}
	
	async connect(path:string) {
		if(this.opts.verbose) sqlite3.verbose();
		this._db = await open({
			filename: path,
			driver: sqlite3.Database
		})
		await this.prechecks()
		return this.db
	};
	
	async disconnect() {
		this.db.close();
	}
	
	async export() {
		
	}

	private async prechecks() {
		const schemaRows = await this.db.all("SELECT name FROM sqlite_schema")
		// const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;", {returnValue:'resultRows'});
		// console.log(schemaRows);
		const foundTableNames = schemaRows.map(t=>t.name);
		['Locations','Presets','Presets_Tags','Tags','UserData'].forEach(name=>{
			if(!foundTableNames.includes(name)) 
				Logger.fatal('Missing expected table "'+name+'". '
					+'Database file may be corrupt or schema might have been changed by xfer.');
		})

		try {
			for (const tableName of Object.values(S2DbTable)) {
				await this.db.all(`SELECT * FROM ${tableName} LIMIT 5`);
			}
		} catch (err) {
			Logger.fatal('A precheck SELECT query has failed. '
				+'Database file may be corrupt or schema might have been changed by xfer.');
		}

		Logger.log('Database schema validation successful.')
	}

}