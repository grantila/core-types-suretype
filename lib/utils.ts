
export const createdByPackage = "core-types-suretype";
export const createdByUrl = "https://github.com/grantila/core-types-suretype";

const capitalize = ( text: string ) =>
	text.charAt( 0 ).toUpperCase( ) + text.slice( 1 );

function ensureNonGlobalName( name: string )
{
	return name === 'Finite' || name === 'NaN' ? `_${name}` : name;
}

export function getNames( name: string )
{
	const typeName = capitalize(
		name
		.replace( /^[^a-zA-Z_]+/, '' )
		.replace( /[^a-zA-Z0-9_$]+$/, '' )
		.replace( /[^a-zA-Z0-9_$]+(.)/g, ( _m, cap ) => cap.toUpperCase( ) )
	);

	const validatorSchemaName = `schema${typeName}`;
	const regularValidatorName = `validate${typeName}`;;
	const ensureValidatorName = `ensure${typeName}`;;
	const typeGuardValidatorName = `is${ensureNonGlobalName(typeName)}`;

	return {
		typeName,
		validatorSchemaName,
		regularValidatorName,
		ensureValidatorName,
		typeGuardValidatorName,
	};
}
