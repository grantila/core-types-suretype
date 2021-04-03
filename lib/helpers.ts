import * as ts from 'typescript'
import type {
	JSONSchema7Array,
	JSONSchema7Object,
	JSONSchema7Type,
} from "json-schema"
import {
	CoreTypeAnnotations,
	ensureArray,
	formatDefault,
	formatSee,
} from 'core-types'

const { factory } = ts;

export { factory, ts };

export const t = {
	null: ( ) => factory.createToken( ts.SyntaxKind.NullKeyword ),
	true: ( ) => factory.createToken( ts.SyntaxKind.TrueKeyword ),
	false: ( ) => factory.createToken( ts.SyntaxKind.FalseKeyword ),
	never: ( ) => factory.createToken( ts.SyntaxKind.NeverKeyword ),
	string: factory.createStringLiteral,
	number: factory.createNumericLiteral,
	ident: factory.createIdentifier,
} as const;

export function createCall(
	functionName: string,
	args: Array< ts.Expression > = [ ],
	typeArgs: Array< ts.TypeNode > | undefined = undefined
)
{
	return factory.createCallExpression(
		t.ident( functionName ),
		typeArgs,
		args
	);
}

export function createChainedCall(
	target: ts.Expression,
	functionName: string,
	args: Array< ts.Expression > = [ ]
)
{
	return factory.createCallExpression(
		factory.createPropertyAccessExpression(
			target,
			t.ident( functionName )
		),
		undefined,
		args
	);
}

export function annotationsToSuretype(
	annotations: CoreTypeAnnotations,
	topLevelName?: string
)
{
	const name = topLevelName ?? annotations.name;
	const {
		title,
		comment,
		default: _default,
		description: _description,
	} = annotations;

	const see = ensureArray( annotations.see );
	const examples = ensureArray( annotations.examples );

	const descriptions = [
		...( _description ? [ _description ] : [ ] ),
		...( see.length ? [ formatSee( see ) ] : [ ] ),
		...( _default ? [ formatDefault( _default ) ] : [ ] ),
	];
	const description = descriptions.length
		? descriptions.join( "\n\n" )
		: undefined;

	const suretypeAnnotations = {
		...( name ? { name } : { } ),
		...( title ? { title } : { } ),
		...( examples.length ? { examples } : { } ),
		...( description ? { description } : { } ),
	};
	if ( !comment && Object.keys( suretypeAnnotations ).length === 0 )
		return undefined;

	return translateObjectValue( suretypeAnnotations );
}

export function createExportModifier( )
{
	return factory.createModifiersFromModifierFlags( ts.ModifierFlags.Export );
}

export interface CreateVariableOptions
{
	export?: boolean;
	typeNode?: ts.TypeNode;
}

export function createVariable(
	name: string,
	value: ts.Expression,
	{
		export: _export = false,
		typeNode = undefined,
	}: CreateVariableOptions = { }
)
{
	return factory.createVariableStatement(
		_export ? createExportModifier( ) : undefined, // modifiers
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					name,
					undefined, // exclamation token
					typeNode,
					value
				)
			],
			ts.NodeFlags.Const
		)
	);
}

export function translateValues( schema: Array< JSONSchema7Type > )
: Array< ts.Expression >
{
	return schema.map( schemaElement => translateValue( schemaElement ) );
}

export function translateArrayValue( schema: JSONSchema7Array )
: ts.Expression
{
	return factory.createArrayLiteralExpression(
		schema.map( schemaElement => translateValue( schemaElement ) )
	);
}

export function translateObjectValue( schema: JSONSchema7Object )
: ts.Expression
{
	return factory.createObjectLiteralExpression(
		Object.keys( schema )
		.map( prop =>
			factory.createPropertyAssignment(
				prop,
				translateValue( schema[ prop ] )
			)
		),
		true
	);
}

export function translateValue( schema: JSONSchema7Type )
: ts.Expression
{
	if ( schema === null )
		return t.null( );
	else if ( schema === true )
		return t.true( );
	else if ( schema === false )
		return t.false( );
	else if ( typeof schema === 'string' )
		return t.string( schema );
	else if ( typeof schema === 'number' )
		return t.number( schema );
	else if ( typeof schema === 'object' && Array.isArray( schema ) )
		return translateArrayValue( schema );
	else if ( typeof schema === 'object' )
		return translateObjectValue( schema );
	throw new Error( `Internal error, cannot translate ${schema}` );
}
