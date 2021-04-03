import * as path from 'path'

import { convertSuretypeToJsonSchema } from './suretype-to-json-schema'


describe( "convertSuretypeToJsonSchema", ( ) =>
{
	it( "should convert types with dependencies", async ( ) =>
	{
		const file = path.join( __dirname, 'test', 'validator.ts' );
		const res = await convertSuretypeToJsonSchema( file );
		const { convertedTypes, notConvertedTypes, data } = res;

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'ChatLine', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );

		expect( data ).toMatchSnapshot( );
	} );
} );
