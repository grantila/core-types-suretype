import { NamedType, NodeDocument } from 'core-types';
import { convertCoreTypesToSureType } from './core-types-to-suretype'
import { JsonSchemaToSuretypeOptions } from './types';


const wrapDocument = ( types: Array< NamedType > ): NodeDocument =>
	( {
		version: 1,
		types
	} );

const options: JsonSchemaToSuretypeOptions = {
	useUnknown: true,
	inlineTypes: true,
	exportSchema: true,
	exportType: true,
	exportValidator: true,
	exportEnsurer: true,
	exportTypeGuard: true,
	forwardSchema: false,
};

describe( "core-types-to-suretype", ( ) =>
{
	it( "simple type", ( ) =>
	{
		const { convertedTypes, notConvertedTypes, data: ts } =
			convertCoreTypesToSureType( wrapDocument( [
				{
					name: 'foo',
					type: 'string',
				}
			] ), options );
		expect( convertedTypes ).toStrictEqual( [ 'foo' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( ts ).toMatchSnapshot( );
	} );

	it( "simple string union of separate types", ( ) =>
	{
		const { convertedTypes, notConvertedTypes, data: ts } =
			convertCoreTypesToSureType( wrapDocument( [
				{
					name: 'bar',
					type: 'string',
					const: 'bar',
				},
				{
					name: 'foo',
					type: 'or',
					or: [
						{
							type: 'ref',
							ref: 'bar',
						},
						{
							type: 'string',
							enum: [ "foo", "baz" ],
						}
					]
				}
			] ), options );
		expect( convertedTypes ).toStrictEqual( [ 'bar', 'foo' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( ts ).toMatchSnapshot( );
	} );

	it( "complex type", ( ) =>
	{
		const res = convertCoreTypesToSureType( wrapDocument( [
			{
				name: 'User',
				type: 'string'
			},
			{
				name: 'foo',
				type: 'object',
				properties: {
					bar: { required: false, node: { type: 'string' } },
					baz: {
						required: true,
						node: {
							type: 'or',
							or: [
								{ type: 'number' },
								{
									type: 'object',
									properties: { },
									additionalProperties: { type: 'boolean' },
								}
							]
						},
					},
					bak: {
						required: true,
						node: {
							type: 'object',
							properties: { },
							additionalProperties: true,
						},
					},
					tupleWithAdditionals: {
						required: true,
						node: {
							type: 'tuple',
							elementTypes: [ { type: 'string' } ],
							additionalItems: { type: 'number' },
							minItems: 1,
						},
					},
					tupleWithObjectAdditionals: {
						required: true,
						node: {
							type: 'tuple',
							elementTypes: [ { type: 'string' } ],
							additionalItems: {
								type: 'object',
								properties: {
									x: {
										required: false,
										node: { type: 'ref', ref: 'User' },
									},
								},
								additionalProperties: false,
							},
							minItems: 1,
						},
					},
				},
				additionalProperties: false,
			}
		] ),
		options
		);
		const { convertedTypes, notConvertedTypes, data: ts } = res;
		expect( convertedTypes ).toStrictEqual( [ 'User', 'foo' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( ts ).toMatchSnapshot( );
	} );

	it( "used in readme", ( ) =>
	{
		const res = convertCoreTypesToSureType( wrapDocument( [
			{
				name: 'User',
				title: 'User type',
				description:
					'This type holds the user information, such as name',
				type: 'object',
				properties: {
					name: {
						node: { type: 'string', title: 'The real name' },
						required: true
					},
				},
				additionalProperties: false,
			},
			{
				name: 'ChatLine',
				title: 'A chat line',
				type: 'object',
				properties: {
					user: {
						node: { type: 'ref', ref: 'User' }, required: true
					},
					line: { node: { type: 'string' }, required: true },
				},
				additionalProperties: false,
			},
		] ), options );

		const { convertedTypes, notConvertedTypes, data: ts } = res;

		expect( convertedTypes ).toStrictEqual( [ 'User', 'ChatLine' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( ts ).toMatchSnapshot( );
	} );

	it( "should write annotations properly", ( ) =>
	{
		const res = convertCoreTypesToSureType( wrapDocument( [
			{
				name: 'User',
				title: 'User type',
				description:
					'This type holds the user information, such as name',
				examples: [ '{ name: "Joe" }' ],
				default: '{ user: "" }',
				see: [ 'http://username' ],
				type: 'object',
				properties: {
					name: {
						node: {
							type: 'string',
							title: 'The real name',
							description: 'Must be a valid name, not */'
						},
						required: true
					},
				},
				additionalProperties: false,
			},
			{
				name: 'ChatLine',
				title: 'A chat line',
				type: 'object',
				properties: {
					user: {
						node: {
							title: 'User ref',
							type: 'ref',
							ref: 'User'
						},
						required: true,
					},
					line: {
						node: {
							examples: 'This is a line',
							type: 'string',
						},
						required: true
					},
				},
				additionalProperties: false,
			},
			{
				name: 'Thing',
				type: 'any',
			},
			{
				title: 'Thing ref',
				name: 'Thingy',
				type: 'or',
				or: [
					{
						type: 'ref',
						ref: 'Thing',
						title: 'Thing is the preferred type',
						see: 'The Thing documentation',
					},
					{
						type: 'number',
						title: 'Just a number',
					},
				],
			},
		] ), options );

		const { convertedTypes, notConvertedTypes, data: ts } = res;

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'ChatLine', 'Thing', 'Thingy', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( ts ).toMatchSnapshot( );
	} );
} );
