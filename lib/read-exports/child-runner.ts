import { parentPort, workerData } from 'worker_threads'

import type { IpcQuery } from './types'
import { readExportedSchemas } from './read-exports-file'


const { file, refMethod, onTopLevelNameConflict } = workerData as IpcQuery;

const response =
	readExportedSchemas( file, refMethod, onTopLevelNameConflict );

parentPort!.postMessage( response );
