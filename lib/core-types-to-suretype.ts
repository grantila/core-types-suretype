import type { ConversionResult, NodeDocument } from 'core-types'
import { convertCoreTypesToJsonSchema } from 'core-types-json-schema'

import { convertJsonSchemaToSureType } from './json-schema-to-suretype'
import type { JsonSchemaToSuretypeOptions } from './types'


export function convertCoreTypesToSureType(
	doc: NodeDocument,
	options: JsonSchemaToSuretypeOptions
)
: ConversionResult< string >
{
	const resJsonSchema = convertCoreTypesToJsonSchema( doc, options );
	const { data: jsonSchema } = resJsonSchema;

	const resSureType = convertJsonSchemaToSureType( jsonSchema, options );

	return {
		convertedTypes: resSureType.convertedTypes,
		notConvertedTypes: [ ...new Set( [
			...resJsonSchema.notConvertedTypes,
			...resSureType.notConvertedTypes,
		] ) ],
		data: resSureType.data,
	};
}
