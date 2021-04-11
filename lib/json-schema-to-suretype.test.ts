import { MissingReferenceError } from 'core-types'
import { convertJsonSchemaToSureType } from './json-schema-to-suretype'
import { JsonSchemaToSuretypeOptions } from './types'


describe( "convertJsonSchemaToSureType", ( ) =>
{
	it( "export recursive and non-recursive at once", ( ) =>
	{
		const definitions = {
			Email: {},
			User: {
				type: 'object',
				description: 'The User type\nyada yada',
				properties: {
					obj: {
						type: 'object',
						description: 'This is a typical foo',
						title: "This is a relatively long title, " +
							"triggering line breaks",
						default: {
							prop: "there is currently no default provided..."
						},
						properties: { prop: { type: 'string' } }
					},
					arr: {
						type: 'array',
						items: { type: 'boolean' },
						minItems: 2,
						maxItems: 5
					},
					tup: {
						type: 'array',
						items: [ { type: 'string' }, { type: 'number' } ],
						additionalItems: { type: 'boolean' }
					},
					str: {
						type: 'string',
						minLength: 3,
						anyOf: [ { format: 'email' }, { format: 'ipv4' } ]
					},
					num: {
						type: 'number', minimum: 5, maximum: 10
					},
					int: {
						type: 'integer', enum: [ 1, 2, 3, 4, 5, 10 ]
					},
					email: { $ref: "#/definitions/Email" },
					bool: { type: 'boolean', const: false },
					nul: { type: 'null' },
					any_of: {
						anyOf: [
							{ type: 'string' },
							{ $ref: "#/definitions/User", description: 'foo' }
						]
					},
					all_of: {
						allOf: [
							{
								type: 'object',
								properties: {
									x: {
										description: 'This is the x number',
										type: 'number'
									}
								}
							},
							{ $ref: "#/definitions/User" }
						]
					},
				},
				required: [ 'obj', 'arr', 'num', 'bool' ],
				additionalProperties: false,
			},
			Link: {
				type: 'object',
				properties: {
					url: { type: 'string' },
					meta: { },
				},
			},
			Product: {
				type: 'object',
				properties: { link: { $ref: "#/definitions/Link" } },
			},
		} as any;

		const { data, convertedTypes } = convertJsonSchemaToSureType(
			{ definitions },
			{
				useUnknown: false,
				inlineTypes: false,
				exportSchema: true,
				exportType: true,
				exportValidator: true,
				exportEnsurer: true,
				exportTypeGuard: true,
				forwardSchema: false,
			}
		);

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'Email', 'User', 'Link', 'Product' ].sort( ) );

		expect( data ).toMatchSnapshot( );
	} );

	it( "non-recursive types export matrix", ( ) =>
	{
		const definitions = {
			Email: {},
			User: {
				type: 'object',
				description: 'The User type\nyada yada',
				properties: {
					obj: {
						type: 'object',
						description: 'This is a typical foo',
						title: "This is a relatively long title, " +
							"triggering line breaks",
						default: {
							prop: "there is currently no default provided..."
						},
						properties: { prop: { type: 'string' } }
					},
					arr: {
						type: 'array',
						items: { type: 'boolean' },
						minItems: 2,
						maxItems: 5
					},
					tup: {
						type: 'array',
						items: [ { type: 'string' }, { type: 'number' } ],
						additionalItems: { type: 'boolean' }
					},
					str: {
						type: 'string',
						minLength: 3,
						anyOf: [ { format: 'email' }, { format: 'ipv4' } ]
					},
					num: {
						type: 'number', minimum: 5, maximum: 10
					},
					int: {
						type: 'integer', enum: [ 1, 2, 3, 4, 5, 10 ]
					},
					email: { $ref: "#/definitions/Email" },
					bool: { type: 'boolean', const: false },
					nul: { type: 'null' },
					any_of: {
						anyOf: [
							{ type: 'string' },
							{ type: 'number' },
						]
					},
					all_of: {
						allOf: [
							{
								type: 'object',
								properties: {
									x: {
										description: 'This is the x number',
										type: 'number'
									}
								}
							},
							{ type: 'string' },
						]
					},
				},
				required: [ 'obj', 'arr', 'num', 'bool' ],
				additionalProperties: false,
			},
			Link: {
				type: 'object',
				properties: {
					url: { type: 'string' },
					meta: { },
				},
			},
			Product: {
				type: 'object',
				properties: { link: { $ref: "#/definitions/Link" } },
			},
		} as any;

		const baseOptions: JsonSchemaToSuretypeOptions = {
			useUnknown: false,
			inlineTypes: false,
			exportSchema: true,
			exportType: true,
			exportValidator: true,
			exportEnsurer: true,
			exportTypeGuard: true,
			forwardSchema: false,
		};

		const combinations: Array< Partial< JsonSchemaToSuretypeOptions > > = [
			{ useUnknown: true },
			{ inlineTypes: true },
			{ exportSchema: false },
			{ exportType: false },
			{ exportValidator: false },
			{ exportEnsurer: false },
			{ exportTypeGuard: false },
			{ forwardSchema: true },
		]

		for ( const override of combinations )
		{
			const options = { ...baseOptions, ...override };

			const { data, convertedTypes } = convertJsonSchemaToSureType(
				{ definitions },
				options
			);

			expect( convertedTypes.sort( ) )
				.toStrictEqual( [ 'Email', 'Link', 'Product', 'User' ] );

			expect( data ).toMatchSnapshot( );
		}
	} );

	it( "should fail properly on missing ref", ( ) =>
	{
		const definitions = {
			User: {
				type: 'object',
				properties: {
					prop: { $ref: '#/definitions/Link' },
				},
			},
		} as any;

		const thrower = ( ) =>
			convertJsonSchemaToSureType(
				{ definitions },
				{ missingReference: 'error' }
			);

		expect( thrower ).toThrowError( MissingReferenceError );
		expect( thrower ).toThrowError( /Link/ );
	} );

	it( "should warn and ignore on missing ref", ( ) =>
	{
		const definitions = {
			User: {
				type: 'object',
				properties: {
					prop: { $ref: '#/definitions/Link' },
				},
			},
		} as any;

		const warn = jest.fn( );
		const result = convertJsonSchemaToSureType(
			{ definitions },
			{ warn }
		);

		const { data, convertedTypes, notConvertedTypes } = result;
		expect( convertedTypes.sort( ) ).toStrictEqual( [ 'Link', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );
		expect( warn.mock.calls[ 0 ][ 0 ] ).toMatch( /missing type.*Link/ );
		expect( data ).toMatchSnapshot( );
	} );

	it( "should add user package header properly", ( ) =>
	{
		const definitions = { User: { type: "string" } } as any;

		const options: JsonSchemaToSuretypeOptions = {
			useUnknown: true,
			inlineTypes: true,
			exportSchema: true,
			exportType: true,
			exportValidator: true,
			exportEnsurer: true,
			exportTypeGuard: true,
			forwardSchema: true,
			userPackage: 'my-package',
			userPackageUrl: 'https://my-package.com',
		};

		const { data, convertedTypes } = convertJsonSchemaToSureType(
			{ definitions },
			options
		);

		expect( convertedTypes.sort( ) ).toStrictEqual( [ 'User' ] );

		expect( data ).toMatchSnapshot( );
	} );
} );
