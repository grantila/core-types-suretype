import { parentPort, workerData } from 'node:worker_threads'

import type { IpcQuery } from './types.js'
import { readExportedSchemas } from './read-exports-file.js'


const { file, refMethod, onTopLevelNameConflict } = workerData as IpcQuery;

readExportedSchemas( file, refMethod, onTopLevelNameConflict )
.then( response =>
	{
		parentPort!.postMessage( response );
	} );
