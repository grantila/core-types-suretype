import * as path from 'path'

import { convertSureTypeToCoreTypes } from './suretype-to-core-types'


describe( "convertSuretypeToJsonSchema", ( ) =>
{
	it( "should convert types with dependencies", async ( ) =>
	{
		const file = path.join( __dirname, 'test', 'validator.ts' );
		const res = await convertSureTypeToCoreTypes( file );
		const { convertedTypes, notConvertedTypes, data } = res;

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'ChatLine', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );

		expect( data ).toMatchSnapshot( );
	} );
} );
