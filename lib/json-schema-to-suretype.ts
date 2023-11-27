import { getParsedByObject, getParsedByString } from 'jsonpos'
import {
	NodeDocument,
	CoreTypesErrorMeta,
	ConversionResult,
	UnsupportedError,
	MissingReferenceError,
	NodePath,
	simplify,
	CoreTypeAnnotations,
	WarnFunction,
} from 'core-types'
import { helpers, convertSingleCoreTypeToTypeScriptAst } from 'core-types-ts'
import {
	convertJsonSchemaToCoreTypes,
	helpers as jsonSchemaHelpers,
} from 'core-types-json-schema'
import type {
	JSONSchema7,
	JSONSchema7Definition,
	JSONSchema7Object,
	JSONSchema7TypeName,
} from 'json-schema'
import { decodeRefNameJsonSchema } from 'openapi-json-schema'

import { analyzeSchema } from './json-schema-analysis.js'
import { JsonSchemaToSuretypeOptions } from './types.js'
import { createdByPackage, createdByUrl, getNames } from './utils.js'
import {
	ts,
	factory,
	t,
	createCall,
	createChainedCall,
	annotationsToSuretype,
	createExportModifier,
	createVariable,
	translateValue,
	translateValues,
} from './helpers.js'


type JSONSchema7SingleType =
	Omit< JSONSchema7, 'type' > & { type?: JSONSchema7TypeName };


function extractAnnotations( schema: JSONSchema7 )
{
	const annotations: CoreTypeAnnotations =
		jsonSchemaHelpers.annotateCoreTypes( { }, schema );
	return annotations;
}

const schemaObjectVariableName = 'rawSchemaObject';

type ContextFlags = 'use-annotate';

interface Context
{
	useUnknown: boolean;
	unsupported: NonNullable< JsonSchemaToSuretypeOptions[ 'unsupported' ] >;
	handleUnsupported: ( msg: string ) => void;
	walk: ( ...property: NodePath ) => Context;
	warn: WarnFunction;
	meta: ( ) => CoreTypesErrorMeta;
	set: ( flag: ContextFlags ) => void;
	path: NodePath;
	topLevelType: string;
}

const defaultWarn: WarnFunction = ( msg, meta ) =>
	console.warn( msg, meta?.path ? `at [${meta?.path.join(', ')}]` : '' );

export function convertJsonSchemaToSureType(
	jsonSchema: JSONSchema7 | string,
	opts: JsonSchemaToSuretypeOptions
)
: ConversionResult
{
	const parsed =
		typeof jsonSchema === 'string'
		? getParsedByString( jsonSchema )
		: getParsedByObject( jsonSchema );
	const { json, jsonString } = parsed;

	const { definitions } = json;

	if ( !definitions )
		throw new UnsupportedError( "JSON Schema must contain definitions" );

	const { cyclic, nonCyclic } = analyzeSchema( json );

	const {
		warn = defaultWarn,
		sourceFilename,
		useUnknown = true,

		forwardSchema = false,
		inlineTypes: _inlineTypes = true,
		exportType = true,
		exportSchema = true,
		exportValidator = true,
		exportEnsurer = true,
		exportTypeGuard = true,
		ajvOptions = {},

		unsupported = 'warn',
		missingReference = 'warn',
	} = opts;

	const inlineTypes = forwardSchema || _inlineTypes;

	const contextFlags = new Set< ContextFlags >( );

	const coreContext: Context = {
		useUnknown,
		unsupported,
		handleUnsupported( msg: string )
		{
			if ( unsupported === 'warn')
				warn( msg, this.meta( ) );
			else if ( unsupported === 'error' )
				throw new UnsupportedError( msg, this.meta( ) );
		},
		walk( ...property )
		{
			return { ...this, path: [ ...this.path, ...property ] };
		},
		warn( msg: string )
		{
			return warn( msg, this.meta( ) );
		},
		meta( )
		{
			return {
				path: this.path,
				filename: sourceFilename,
				source: jsonString
			};
		},
		set: ( flag: ContextFlags ) => contextFlags.add( flag ),
		path: [ ],
		topLevelType: '',
	};

	const definedDefinitions = Object.keys( definitions );
	[ ...cyclic, ...nonCyclic ].forEach( definition =>
	{
		if ( !definedDefinitions.includes( definition ) )
		{
			if ( missingReference === 'error' )
				throw new MissingReferenceError(
					definition,
					coreContext.meta( )
				);
			else if ( missingReference === 'warn' )
				coreContext.warn(
					`Reference to missing type: ${definition}, ignoring`
				);
			definitions[ definition ] = { }; // Becomes any/unknown
		}
	} );

	const jsonSchemaAsCoreTypes = convertJsonSchemaToCoreTypes( json );
	const coreTypes = simplify( jsonSchemaAsCoreTypes.data );

	Object.keys( definitions )
	.filter( key =>
	{
		if ( definitions[ key ] === false )
		{
			coreContext
				.walk( key )
				.handleUnsupported(
					`Top-level type being false is unsupported`
				);
			return false;
		}
		return true;
	} );

	const isAnyCyclic = cyclic.length > 0;

	const rawSchemas = forwardSchema ? [ ...cyclic, ...nonCyclic ] : cyclic;

	const jsonSchemaChunk =
		( !isAnyCyclic && !forwardSchema ) ? [ ] : [
			helpers.wrapAnnotations(
				createVariable(
					schemaObjectVariableName,
					translateValue( {
						definitions: Object.fromEntries(
							rawSchemas.map( key => [
								key,
								definitions[ key ] === true
								? { }
								: definitions[ key ] as JSONSchema7Object
							] )
						)
					} )
				),
				!isAnyCyclic ? { } :
				{
					description:
						'These cyclic types need to be treated as raw ' +
						'JSON Schema\n\n' +
						'Cyclic types cannot be deduced from ' +
						'typeof in TypeScript',
				}
			)
		];

	const cyclicSet = new Set( cyclic );

	// Types which depend on other types must come afterwards
	const orderedTypes = [ ...cyclic, ...nonCyclic ];

	const convertedTypes: Array< string > = [ ];

	const ajvOptionsEntries = Object.entries(ajvOptions)
	const hasCustomAjvOptions = !!ajvOptionsEntries.length

	const statements = [
		...jsonSchemaChunk,
		...(hasCustomAjvOptions
			? [
					createVariable(
						"ajvOptions",
						factory.createObjectLiteralExpression(
							ajvOptionsEntries.map( ( [ key, value ] ) =>
								factory.createPropertyAssignment(
									key,
									typeof value === 'string' ? t.string( value ) : value ? t.true( ) : t.false( )
								)
							)
						)
					),
				]
			: []),
		...orderedTypes.flatMap((name) => {
			const isCyclic = cyclicSet.has(name)

			const schemaObject = definitions[name]

			const ctx: Context = {
				...coreContext,
				topLevelType: name,
			}

			const exports: Array<ts.Node> = []

			const { validatorSchemaName, regularValidatorName, ensureValidatorName, typeGuardValidatorName } = getNames(name)
			const typeName = name

			exports.push(
				forwardSchema || isCyclic
					? createRawValidatorSchema(ctx, exportSchema, typeName, validatorSchemaName)
					: createValidatorSchema(ctx, exportSchema, typeName, validatorSchemaName, schemaObject)
			)

			// TODO: Forward TypeScript types, if that's what the source is
			exports.push(
				inlineTypes || isCyclic
					? createPrettyType(ctx, coreTypes, typeName, useUnknown)
					: createTypeNameFromSchema(exportType, typeName, validatorSchemaName)
			)

			if (exportValidator)
				exports.push(createRegularValidator(typeName, validatorSchemaName, regularValidatorName, hasCustomAjvOptions))

			if (exportEnsurer)
				exports.push(createEnsureValidator(typeName, validatorSchemaName, ensureValidatorName, hasCustomAjvOptions))

			if (exportTypeGuard)
				exports.push(
					createTypeGuardValidator(typeName, validatorSchemaName, typeGuardValidatorName, hasCustomAjvOptions)
				)

			convertedTypes.push(typeName)

			return exports
		}),
	]

	const importRegular = nonCyclic.length > 0;
	const importRaw = forwardSchema || cyclic.length > 0;
	const importCompile = exportValidator || exportEnsurer || exportTypeGuard;
	const importTypeOf = !inlineTypes && nonCyclic.length > 0;
	const importAnnotate = contextFlags.has( 'use-annotate' );

	const importHeader = createImportHeader(
		importRegular,
		importRaw,
		importCompile,
		importTypeOf,
		importAnnotate
	);

	const sourceCode = [ importHeader, ...statements ]
		.map( tsNode =>
			helpers.generateCode( tsNode )
		)
		.join( "\n\n" );

	const header = helpers.createCodeHeader( {
		...opts,
		createdByPackage,
		createdByUrl,
	} );

	return {
		data:
			header +
			sourceCode +
			( sourceCode.endsWith( "\n" ) ? "" : "\n" ),
		convertedTypes,
		notConvertedTypes: [ ],
	};
}

function createImportHeader(
	regular: boolean,
	raw: boolean,
	compile: boolean,
	TypeOf: boolean,
	annotate: boolean
)
{
	const hasNonTypeImport = regular || raw || compile || annotate;

	const importedMembers = [
		...( regular ? [ 'suretype', 'v' ] : [ ] ),
		...( raw ? [ 'raw' ] : [ ] ),
		...( compile ? [ 'compile' ] : [ ] ),
		...( annotate ? [ 'annotate' ] : [ ] ),
		...( TypeOf ? [ 'TypeOf' ] : [ ] ),
	]
	.map( name =>
		factory.createImportSpecifier(
			!hasNonTypeImport,
			undefined,
			t.ident( name )
		)
	);
	return factory.createImportDeclaration(
		undefined, // modifiers
		factory.createImportClause(
			false,
			undefined,
			factory.createNamedImports( importedMembers )
		),
		factory.createStringLiteral( 'suretype', true )
	)
}

function createPrettyType(
	ctx: Context,
	doc: NodeDocument,
	name: string,
	useUnknown: boolean
)
{
	const coreType = doc.types.find( type => type.name === name );

	if ( coreType == null )
		throw new MissingReferenceError( name, ctx.meta( ) );

	return convertSingleCoreTypeToTypeScriptAst(
		coreType!,
		{ declaration: false, useUnknown, namespaces: 'ignore' }
	).declaration as ts.Node;
}

function createTypeNameFromSchema(
	export_: boolean,
	typeName: string,
	schemaName: string
)
{
	return factory.createTypeAliasDeclaration(
		export_ ? createExportModifier( ) : undefined, // modifiers
		t.ident( typeName ),
		undefined, // type parameters
		factory.createTypeReferenceNode(
			"TypeOf", // type name
			[
				factory.createTypeQueryNode( t.ident( schemaName ) ),
			]
		)
	);
}

function createRegularValidator(
	typeName: string,
	validatorSchemaName: string,
	exportedName: string,
	hasCustomAjvOptions: boolean,
)
{
	const exportNode = createVariable(
		exportedName,
		factory.createCallExpression(
			t.ident( "/*@__PURE__*/ compile" ),
			undefined, // type arguments
			[
				t.ident(validatorSchemaName),
				...( hasCustomAjvOptions ? [ factory.createObjectLiteralExpression( [ factory.createShorthandPropertyAssignment( "ajvOptions" ) ] ) ] : [ ] )
			]
		),
		{ export: true }
	)
	return helpers.wrapAnnotations(
		exportNode,
		{
			description: `## Validate that a variable is a ${typeName}\n\n` +
				'@returns ValidationResult',
		}
	);
}

function createEnsureValidator(
	typeName: string,
	validatorSchemaName: string,
	exportedName: string,
	hasCustomAjvOptions: boolean,
)
{
	const exportNode = factory.createVariableStatement(
		createExportModifier( ), // modifiers
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					exportedName,
					undefined, // exclamation token
					undefined, // type node
					factory.createCallExpression(
						t.ident( "/*@__PURE__*/ compile" ),
						[
							factory.createTypeQueryNode(
								t.ident( validatorSchemaName )
							),
							factory.createTypeReferenceNode( typeName )
						],
						[
							t.ident( validatorSchemaName ),
							factory.createObjectLiteralExpression( [
								factory.createPropertyAssignment(
									"ensure", t.true( )
								),
								...( hasCustomAjvOptions ? [ factory.createShorthandPropertyAssignment( "ajvOptions" ) ] : [ ] )
							] ),
						]
					)
				)
			],
			ts.NodeFlags.Const
		)
	);
	return helpers.wrapAnnotations(
		exportNode,
		{
			description: [
				`## Ensure a variable is a ${typeName}`,
				'',
				'This call will throw a ValidationError if the ' +
					`variable isn't a ${typeName}.`,
				'',
				`If the variable **is** a ${typeName}, the returned ` +
					'variable will be of that type.'
			].join( '\n' )
		}
	);
}

function createTypeGuardValidator(
	typeName: string,
	validatorSchemaName: string,
	exportedName: string,
	hasCustomAjvOptions: boolean
)
{
	const exportNode = factory.createVariableStatement(
		createExportModifier( ), // modifiers
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					exportedName,
					undefined, // exclamation token
					undefined, // type node
					factory.createCallExpression(
						t.ident( "/*@__PURE__*/ compile" ),
						undefined, // type arguments
						[
							t.ident( validatorSchemaName ),
							factory.createObjectLiteralExpression( [
								factory.createPropertyAssignment(
									"simple", t.true( )
								),
								...( hasCustomAjvOptions ? [ factory.createShorthandPropertyAssignment( "ajvOptions" ) ] : [ ] )
							] )
						]
					)
				)
			],
			ts.NodeFlags.Const
		)
	);
	return helpers.wrapAnnotations(
		exportNode,
		{
			description: `## Validates that a variable is a ${typeName}\n\n` +
				'@returns boolean',
		}
	);
}

function createRawValidatorSchema(
	_ctx: Context,
	exportSchema: boolean,
	typeName: string,
	validatorSchemaName: string
)
{
	const exportNode = factory.createVariableStatement(
		exportSchema ? createExportModifier( ) : undefined,
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					validatorSchemaName,
					undefined, // exclamation token
					undefined, // type node
					createCall(
						'raw',
						[
							t.ident( schemaObjectVariableName ),
							t.string( typeName )
						],
						[
							factory.createTypeReferenceNode( typeName )
						]
					)
				)
			],
			ts.NodeFlags.Const
		)
	);
	return !exportSchema
		? exportNode
		: helpers.wrapAnnotations(
			exportNode,
			{ description: `The validation schema for a ${typeName}` }
		);
}

function createValidatorSchema(
	ctx: Context,
	exportSchema: boolean,
	typeName: string,
	validatorSchemaName: string,
	schemaObject: JSONSchema7Definition
)
{
	const exportNode = factory.createVariableStatement(
		exportSchema ? createExportModifier( ) : undefined,
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					validatorSchemaName,
					undefined, // exclamation token
					undefined, // type node
					createValidator(
						ctx,
						schemaObject,
						{ topLevelName: typeName }
					)
				)
			],
			ts.NodeFlags.Const
		)
	);
	return !exportSchema
		? exportNode
		: helpers.wrapAnnotations(
			exportNode,
			{ description: `The validation schema for a ${typeName}` }
		);
}

interface CreateValidatorOptions
{
	topLevelName?: string;
	required?: boolean;
	includeAnnotations?: boolean;
}

function createValidator(
	ctx: Context,
	def: JSONSchema7Definition,
	{
		topLevelName,
		required = false,
		includeAnnotations = true,
	}: CreateValidatorOptions = { }
)
: ts.Expression
{
	if ( def === false )
	{
		ctx.handleUnsupported(
			"false is not a valid schema type for core-types-suretype"
		);
		return createAnyCall( ctx );
	}
	else if ( def === true )
		return createAnyCall( ctx );

	const annotations = extractAnnotations( def );
	const suretypeAnnotations =
		annotationsToSuretype( annotations, topLevelName );
	const annotationsArgs =
		suretypeAnnotations ? [ suretypeAnnotations ] : [ ];

	const callAnnotate = ( expr: ts.Expression ) =>
	{
		ctx.set( 'use-annotate' );
		return createCall( 'annotate', [ ...annotationsArgs, expr ] );
	};

	const wrapDecorations = ( expr: ts.Expression ) =>
		!includeAnnotations
		? expr
		: annotationsArgs.length === 0
		? expr
		: topLevelName
		? createCall( 'suretype', [ ...annotationsArgs, expr ] )
		: callAnnotate( expr );

	const wrapAnnotations = ( expr: ts.Expression ) =>
		wrapDecorations( expr );

	const wrapRequired = ( expr: ts.Expression ) =>
		required
		? createChainedCall( expr, 'required' )
		: expr;
	const wrap = ( expr: ts.Expression ) =>
		wrapAnnotations( wrapRequired( expr ) );

	const traversal: Traversal = {
		ctx,
		def: def as JSONSchema7SingleType,
	};

	if ( typeof def.$ref === 'string' )
		return wrap( wrapRef( ctx, def.$ref ) );

	if ( Array.isArray( def.type ) )
		// Convert into 'anyOf'
		return wrap(
			createCall(
				"v.anyOf",
				[
					factory.createArrayLiteralExpression(
						def.type.map( type =>
							createValidator(
								ctx,
								{ ...def, type },
								{ includeAnnotations: false }
							)
						)
					)
				]
			)
		);

	if ( def.type === 'null' )
		return wrap(
			wrapValidatorGenerics(
				traversal,
				createCall( "v.null" )
			)
		);

	else if ( def.type === 'boolean' )
		return wrap( wrapBoolean( traversal, createCall( "v.boolean" ) ) );

	else if ( def.type === 'integer' )
		return wrap(
			wrapNumber(
				traversal,
				createChainedCall( createCall( "v.number" ), 'integer' )
			)
		);

	else if ( def.type === 'number' )
		return wrap( wrapNumber( traversal, createCall( "v.number" ) ) );

	else if ( def.type === 'string' )
		return wrap( wrapString( traversal, createCall( "v.string" ) ) );

	else if ( def.type === 'array' )
		return wrap( wrapArray( traversal ) );

	else if ( def.type === 'object' )
		return wrap( wrapObject( traversal ) );

	if ( Array.isArray( def.anyOf ) )
		return wrap(
			wrapValidatorGenerics(
				traversal,
				createCall(
					"v.anyOf",
					[
						factory.createArrayLiteralExpression(
							def.anyOf.map( type =>
								createValidator( ctx, type )
							)
						)
					]
				),
				{ noAnyOf: true }
			)
		);

	if ( Array.isArray( def.allOf ) )
		return wrap(
			wrapValidatorGenerics(
				traversal,
				createCall(
					"v.allOf",
					[
						factory.createArrayLiteralExpression(
							def.allOf.map( type =>
								createValidator( ctx, type )
							)
						)
					]
				),
				{ noAllOf: true }
			)
		);

	return wrap( wrapValidatorGenerics( traversal, createAnyCall( ctx ) ) );
}

function createAnyCall( ctx: Context )
{
	return createCall( ctx.useUnknown ? 'v.unknown' : 'v.any' );
}

function createValidators(
	ctx: Context,
	defs: Array< JSONSchema7Definition >,
	parentType?: JSONSchema7TypeName
)
{
	return defs
		.filter( def =>
			typeof def !== 'object'
			? true
			: ( !def.type || def.type === parentType )
		)
		.map( def =>
			typeof def !== 'object' ? def : ( {
				...def,
				type: def.type ?? parentType,
			} )
		)
		.map( ( def, index ) =>
			createValidator( ctx.walk( index ), def )
		);
}

interface Traversal< SchemaType = JSONSchema7SingleType >
{
	ctx: Context;
	def: SchemaType;
	required?: boolean;
}

interface WrapValidatorGenericsOptions
{
	noAnyOf?: boolean;
	noAllOf?: boolean;
}

function wrapValidatorGenerics(
	traversal: Traversal< JSONSchema7SingleType >,
	expr: ts.Expression,
	{
		noAnyOf = false,
		noAllOf = false,
	}: WrapValidatorGenericsOptions = { }
)
{
	const { ctx, def, required } = traversal;

	if ( required )
		expr = createChainedCall( expr, 'required' );

	if ( def.const !== undefined )
		expr = createChainedCall(
			expr,
			'const',
			[ translateValue( def.const ) ]
		);

	if ( Array.isArray( def.enum ) )
		expr = createChainedCall(
			expr,
			'enum',
			translateValues( def.enum )
		);

	if ( def.default !== undefined )
		expr = createChainedCall(
			expr,
			'default',
			[ translateValue( def.default ) ]
		);

	if ( !noAnyOf && Array.isArray( def.anyOf ) )
	{
		const subCtx = ctx.walk( 'anyOf' );
		expr = createChainedCall(
			expr,
			'anyOf',
			[
				factory.createArrayLiteralExpression(
					createValidators( subCtx, def.anyOf, def.type )
				)
			]
		);
	}

	if ( !noAllOf && Array.isArray( def.allOf ) )
	{
		const subCtx = ctx.walk( 'allOf' );
		expr = createChainedCall(
			expr,
			'allOf',
			[
				factory.createArrayLiteralExpression(
					createValidators( subCtx, def.allOf, def.type )
				)
			]
		);
	}

	return expr;
}

function wrapRef( ctx: Context, name: string ): ts.Expression
{
	const decoded = decodeRefNameJsonSchema( name );

	if ( decoded === ctx.topLevelType )
		return createCall( 'v.recursive' );

	if ( decoded.match( /[#/ ]/ ) )
	{
		ctx.handleUnsupported( `Unsupported reference type: ${name}` );
		return createAnyCall( ctx );
	}

	return t.ident( getNames( decoded ).validatorSchemaName );
}

function wrapBoolean( traversal: Traversal, expr: ts.Expression )
{
	return wrapValidatorGenerics( traversal, expr );
}

function wrapNumber( traversal: Traversal, expr: ts.Expression )
{
	const { def } = traversal;

	const wrapMultipleOf = ( expr: ts.Expression ) =>
		typeof def.multipleOf === 'number'
		? createChainedCall(
			expr,
			'multipleOf',
			[ translateValue( def.multipleOf ) ]
		)
		: expr;
	const wrapMinimum = ( expr: ts.Expression ) =>
		typeof def.minimum === 'number'
		? createChainedCall(
			expr,
			'gte',
			[ translateValue( def.minimum ) ]
		)
		: expr;
	const wrapExclusiveMinimum = ( expr: ts.Expression ) =>
		typeof def.exclusiveMinimum === 'number'
		? createChainedCall(
			expr,
			'gt',
			[ translateValue( def.exclusiveMinimum ) ]
		)
		: expr;
	const wrapMaximum = ( expr: ts.Expression ) =>
		typeof def.maximum === 'number'
		? createChainedCall(
			expr,
			'lt',
			[ translateValue( def.maximum ) ]
		)
		: expr;
	const wrapExclusiveMaximum = ( expr: ts.Expression ) =>
		typeof def.exclusiveMaximum === 'number'
		? createChainedCall(
			expr,
			'lte',
			[ translateValue( def.exclusiveMaximum ) ]
		)
		: expr;

	return wrapValidatorGenerics(
		traversal,
		wrapMaximum(
			wrapExclusiveMaximum(
				wrapMinimum(
					wrapExclusiveMinimum(
						wrapMultipleOf( expr )
					)
				)
			)
		)
	);
}

function wrapString( traversal: Traversal, expr: ts.Expression )
{
	const { def } = traversal;

	const wrapMinLength = ( expr: ts.Expression ) =>
		typeof def.minLength === 'number'
		? createChainedCall(
			expr,
			'minLength',
			[ translateValue( def.minLength ) ]
		)
		: expr;
	const wrapMaxLength = ( expr: ts.Expression ) =>
		typeof def.maxLength === 'number'
		? createChainedCall(
			expr,
			'maxLength',
			[ translateValue( def.maxLength ) ]
		)
		: expr;
	const wrapPattern = ( expr: ts.Expression ) =>
		typeof def.pattern === 'string'
		? createChainedCall(
			expr,
			'pattern',
			[ translateValue( def.pattern ) ]
		)
		: expr;
	const wrapFormat = ( expr: ts.Expression ) =>
		typeof def.format === 'string'
		? createChainedCall(
			expr,
			'format',
			[ translateValue( def.format ) ]
		)
		: expr;

	return wrapValidatorGenerics(
		traversal,
		wrapFormat(
			wrapPattern(
				wrapMaxLength(
					wrapMinLength( expr )
				)
			)
		)
	);
}

function wrapArray( traversal: Traversal )
{
	const { ctx, def } = traversal;

	const { items, additionalItems = true } = def;

	const isTuple = Array.isArray( items );

	const itemsArgs =
		Array.isArray( items )
		? [
				factory.createArrayLiteralExpression(
				items
				.map( ( item, index ) =>
					createValidator( ctx.walk( 'items', index ), item )
				),
				true
			)
		]
		: items === undefined
		? [ ]
		: [ createValidator( ctx.walk( 'items' ), items ) ];

	if ( !isTuple && additionalItems !== true )
		ctx.warn(
			"Arrays with non-array items shouldn't set the " +
				"'additionalItems' property. Ignoring value."
		);

	if ( def.contains !== undefined )
		ctx.handleUnsupported( "Property 'contains' is not supported" );
	if ( def.uniqueItems !== undefined )
		ctx.handleUnsupported( "Property 'uniqueItems' is not supported" );

	const wrapMinItems = ( expr: ts.Expression ) =>
		def.minItems === undefined
		? expr
		: createChainedCall(
			expr,
			'minItems',
			[ translateValue( def.minItems ) ]
		);

	const wrapMaxItems = ( expr: ts.Expression ) =>
		def.maxItems === undefined
		? expr
		: createChainedCall(
			expr,
			'maxItems',
			[ translateValue( def.maxItems ) ]
		);

	const wrapAdditionalItems = ( expr: ts.Expression ) =>
		!isTuple
		? expr // Ignored for arrays, only applicable for tuples
		: additionalItems === true
		? expr
		: additionalItems === false
		? createChainedCall( expr, 'additional', [ t.false( ) ] )
		: createChainedCall(
			expr,
			'additional',
			[ createValidator( ctx, additionalItems ) ]
		);

	return wrapValidatorGenerics(
		traversal,
		wrapAdditionalItems(
			wrapMaxItems(
				wrapMinItems(
					createCall( "v.array", itemsArgs )
				)
			)
		)
	);
}

function wrapObject( traversal: Traversal )
{
	const { ctx, def } = traversal;

	const { required = [ ] } = def;

	const properties =
		def.properties
		? factory.createObjectLiteralExpression(
			Object.keys( def.properties )
			.map( prop =>
				factory.createPropertyAssignment(
					prop,
					createValidator(
						traversal.ctx.walk( 'properties', prop ),
						def.properties![ prop ],
						{ required: required.includes( prop ) }
					)
				)
			),
			true
		)
		: translateValue( { } );

	const additionalProperties =
		def.additionalProperties === undefined
		? true
		: def.additionalProperties === false
		? false
		: Object.keys( def.additionalProperties ).length === 0
		? true
		: def.additionalProperties;

	const wrapAdditionalProperties = ( expr: ts.Expression ) =>
		additionalProperties === true
		? createChainedCall( expr, 'additional', [ t.true( ) ] )
		: additionalProperties === false
		? expr
		: createChainedCall(
			expr,
			'additional',
			[
				createValidator(
					ctx.walk( 'additionalProperties' ),
					additionalProperties
				)
			]
		);

	if ( def.patternProperties !== undefined )
		ctx.handleUnsupported( "Property 'patternProperties' not supported" );
	if ( def.propertyNames !== undefined )
		ctx.handleUnsupported( "Property 'propertyNames' not supported" );
	if ( def.minProperties !== undefined )
		ctx.handleUnsupported( "Property 'minProperties' not supported" );
	if ( def.maxProperties !== undefined )
		ctx.handleUnsupported( "Property 'maxProperties' not supported" );
	if ( def.dependencies !== undefined )
		ctx.handleUnsupported( "Property 'dependencies' not supported" );

	return wrapValidatorGenerics(
		traversal,
		wrapAdditionalProperties( createCall( "v.object", [ properties ] ) )
	);
}
