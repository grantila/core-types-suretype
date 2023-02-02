import {
	getValidatorSchema,
	extractJsonSchema,
	ensureNamed,
	ExportRefMethod,
	OnTopLevelNameConflict,
} from "suretype"

import { IpcResponse, serializeError } from './types.js'


export interface ExportedModule
{
	value: any; // BaseValidator< unknown >;
	name?: string;
}
export type ExportedModules = Array< ExportedModule >;

export async function readExportedSchemas(
	filename: string,
	refMethod: ExportRefMethod,
	onTopLevelNameConflict: OnTopLevelNameConflict
)
: Promise< IpcResponse >
{
	const ret: ExportedModules = [ ];

	let mod: any;
	try
	{
		 mod = await import( filename );
	}
	catch ( err )
	{
		return {
			ok: false,
			error: serializeError( err ),
		};
	}

	if ( Array.isArray( mod ) )
	{
		ret.push(
			...mod.map( ( value: any ) => ( { value } ) )
		);
	}
	else if ( mod && typeof mod === "object" )
	{
		Object
			.keys( mod )
			.filter( key => ![ "default", "__esModule" ].includes( key ) )
			.forEach( key =>
			{
				ret.push( { name: key, value: mod[ key ] } );
			} );

		if ( mod.__esModule && mod.default )
		{
			if ( Array.isArray( mod.default ) )
				ret.push(
					...mod.default.map( ( value: any ) => ( { value } ) )
				);
			else if ( typeof mod.default === "object" )
				Object
					.keys( mod.default )
					.forEach( key =>
					{
						ret.push( { name: key, value: mod.default[ key ] } );
					} );
		}
	}

	const schemas = ret
		.map( ( { value, name } ) =>
			( { name, schema: getValidatorSchema( value ) } )
		)
		.map( ( { name, schema } ) =>
			name && schema
			? ensureNamed( name, schema )
			: schema
		)
		.filter( < T >( value: T ): value is NonNullable< T > => !!value );

	const { schema: jsonSchema } = extractJsonSchema(
		schemas,
		{
			onNonSuretypeValidator: 'ignore',
			onTopLevelNameConflict,
			refMethod,
		}
	);

	return { ok: true, jsonSchema };
}
