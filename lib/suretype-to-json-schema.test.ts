import path from 'path'
import { fileURLToPath } from 'url'

import { convertSuretypeToJsonSchema } from './suretype-to-json-schema.js'


const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

describe( "convertSuretypeToJsonSchema", ( ) =>
{
	it( "should convert types with dependencies", async ( ) =>
	{
		const file = path.join( __dirname, 'test', 'validator.js' );
		const res = await convertSuretypeToJsonSchema( file );
		const { convertedTypes, notConvertedTypes, data } = res;

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'ChatLine', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );

		expect( data ).toMatchSnapshot( );
	} );
} );
