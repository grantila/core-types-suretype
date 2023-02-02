import { analyzeSchema } from './json-schema-analysis.js'


describe( "analyzeSchema", ( ) =>
{
	it( "should analyze correctly", ( ) =>
	{
		const jsonSchema = {
			definitions: {
				Link: {}, // Non-cyclic but dependency of Message
				Subscriber: {
					type: 'object',
					properties: {
						user: { $ref: '#/definitions/User' },
					},
				},
				Message: {
					type: 'object',
					properties: {
						replyTo: { $ref: '#/definitions/Message' },
						link: { $ref: '#/definitions/Link' },
						subscriber: { $ref: '#/definitions/Subscriber' },
					},
				},
				User: {
					type: 'object',
					properties: {
						parent: { $ref: '#/definitions/User' },
						lastMessage: { $ref: '#/definitions/Message' },
					},
				},
				DM: {
					type: 'object',
					properties: {
						lastUser: { $ref: '#/definitions/User' },
					},
				},
				Actions: {
					type: 'object',
					properties: {
						dms: {
							type: 'array',
							items: { $ref: '#/definitions/DM' },
						},
					},
				},
				// Has dependencies, but nothing cyclic
				Product: {},
				Purchases: {
					type: 'array',
					items: { $ref: '#/definitions/Link' },
				},
				Cart: {
					type: 'array',
					items: { $ref: '#/definitions/Product' },
				},
			}
		};

		const { cyclic, nonCyclic } = analyzeSchema( jsonSchema );

		expect( nonCyclic ).toStrictEqual( [ 'Product', 'Cart' ] );
		expect( cyclic.sort( ) ).toStrictEqual(
			[
				'Link',
				'User',
				'Message',
				'Subscriber',
				'Actions',
				'DM',
				'Purchases',
			]
			.sort( )
		);
	} );
} );
