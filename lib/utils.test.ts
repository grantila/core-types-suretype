import { getNames } from './utils'

describe( "exported names", ( ) =>
{
	it( "should handle bad characters properly", ( ) =>
	{
		const names = getNames( ' 0Bad name-type €"' );
		expect( names ).toStrictEqual( {
			typeName: 'BadNameType',
			validatorSchemaName: 'schemaBadNameType',
			regularValidatorName: 'validateBadNameType',
			ensureValidatorName: 'ensureBadNameType',
			typeGuardValidatorName: 'isBadNameType',
		} );
	} );

	it( "should handle is*-conflicts", ( ) =>
	{
		const names = getNames( 'finite' );
		expect( names ).toStrictEqual( {
			typeName: 'Finite',
			validatorSchemaName: 'schemaFinite',
			regularValidatorName: 'validateFinite',
			ensureValidatorName: 'ensureFinite',
			typeGuardValidatorName: 'is_Finite',
		} );
	} );
} );
