import type { ConversionResult } from 'core-types'
import { decorateSchema } from 'core-types-json-schema'
import * as path from 'path'

import type { SuretypeToJsonSchemaOptions } from './types'
import { extractJsonSchema } from './read-exports'
import { catchError } from './async-error'


export async function convertSuretypeToJsonSchema(
	filename: string,
	options: SuretypeToJsonSchemaOptions = { }
)
: Promise< ConversionResult< { } > >
{
	const {
		warn = console.warn.bind( console ),
		refMethod = 'provided',
		nameConflict = 'error',
	} = options ?? { };

	const { result, error } = await catchError(
		( ) => extractJsonSchema(
			filename,
			refMethod,
			nameConflict === 'rename' ? 'rename' : 'error'
		)
	);

	if ( error )
	{
		if ( error.name?.startsWith( 'Duplicate' ) && nameConflict === 'warn' )
			warn( error.message, error );
		else
			throw error;
	}

	if ( !result )
		return { data: { }, convertedTypes: [ ], notConvertedTypes: [ ] };

	decorateSchema(
		result.jsonSchema,
		{ sourceFilename: path.basename( filename ), ...options },
		'core-types-suretype',
		'https://github.com/grantila/core-types-suretype',
	);

	return {
		data: result.jsonSchema,
		convertedTypes: Object.keys( result.jsonSchema.definitions! ),
		notConvertedTypes: [ ],
	};
}
