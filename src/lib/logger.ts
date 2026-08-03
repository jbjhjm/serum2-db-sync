import chalk, { type ColorName } from 'chalk';

export namespace Logger {
	export function log(...values:any[]):void {
		_log(values, 'blue')
	}
	export function error(...values:any[]):void {
		_log(values, 'red')
	}
	export function fatal(...values:any[]):never {
		_log(values, 'red');
		process.exit();
	}
	export function warn(...values:any[]):void {
		_log(values, 'yellow')
	}
	export function success(...values:any[]):void {
		_log(values, 'green')
	}

	function _log(values:any[], color:ColorName) {
		const outVal = values.map(val=>{
			if(typeof val === 'object') return JSON.stringify(val)
			return val;
		})
		process.stdout.write(chalk[color](outVal) + '\n')
	}
}