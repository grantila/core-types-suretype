import { Worker } from 'worker_threads'
import * as path from 'path'
import type { ExportRefMethod, OnTopLevelNameConflict } from 'suretype'

import {
	IpcQuery,
	IpcResponse,
	IpcResponseSuccess,
	serializeError,
} from './types'


const wrapper = path.join( __dirname, 'child-runner-wrapper.js' );

export async function extractJsonSchema(
	file: string,
	refMethod: ExportRefMethod,
	onTopLevelNameConflict: OnTopLevelNameConflict
)
: Promise< IpcResponseSuccess >
{
	const response = await new Promise< IpcResponse >( resolve =>
	{
		const workerData: IpcQuery = {
			file,
			refMethod,
			onTopLevelNameConflict,
		};
		const worker = new Worker( wrapper, { workerData } );

		worker.on( 'message', resolve );
		worker.on( 'error', err =>
		{
			resolve( {
				ok: false,
				error: serializeError( err ),
			} );
		} );
		worker.on( 'exit', code =>
		{
			if ( code !== 0 )
				resolve( {
					ok: false,
					error: {
						name: 'Error',
						message: `Worker stopped with exit code ${code}`,
					},
				} );
		} );
	});

	if ( !response.ok )
	{
		const err = new Error( response.error.message );
		err.name = response.error.name;
		if ( response.error.stack )
			err.stack = response.error.stack;
		throw err;
	}

	return response;
};
