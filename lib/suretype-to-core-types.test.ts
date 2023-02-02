import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { convertSureTypeToCoreTypes } from './suretype-to-core-types.js'


const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

describe( "convertSuretypeToJsonSchema", ( ) =>
{
	it( "should convert types with dependencies", async ( ) =>
	{
		const file = path.join( __dirname, 'test', 'validator.js' );
		const res = await convertSureTypeToCoreTypes( file );
		const { convertedTypes, notConvertedTypes, data } = res;

		expect( convertedTypes.sort( ) )
			.toStrictEqual( [ 'ChatLine', 'User' ] );
		expect( notConvertedTypes ).toStrictEqual( [ ] );

		( data as any ).types.sort( ( a: any, b: any ) =>
			a.name.localeCompare( b.name )
		);

		expect( data ).toMatchSnapshot( );
	} );
} );
