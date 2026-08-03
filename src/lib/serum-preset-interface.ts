
export interface SerumPresetObject {
	metadata: {
		fileType: string,
		hash: string,
		presetAuthor: string,
		presetDescription: string,
		presetName: string,
		product: string,
		productVersion: string,
		tags: string[],
		url: string,
		vendor: string,
		version: number
	},
	data: {
		[k:string]:any
	}
}
