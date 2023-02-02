import type { ConversionResult, NodeDocument } from 'core-types'
import { convertJsonSchemaToCoreTypes } from 'core-types-json-schema'

import { convertSuretypeToJsonSchema } from './suretype-to-json-schema.js'
import type { SuretypeToJsonSchemaOptions } from './types.js'


export async function convertSureTypeToCoreTypes(
	filename: string,
	options: SuretypeToJsonSchemaOptions = { }
)
: Promise< ConversionResult< NodeDocument > >
{
	const resSchema = await convertSuretypeToJsonSchema( filename, options );
	const { data: jsonSchema } = resSchema;

	const resCoreTypes = convertJsonSchemaToCoreTypes( jsonSchema );

	return {
		convertedTypes: resCoreTypes.convertedTypes,
		notConvertedTypes: [ ...new Set( [
			...resSchema.notConvertedTypes,
			...resCoreTypes.notConvertedTypes,
		] ) ],
		data: resCoreTypes.data,
	};
}
