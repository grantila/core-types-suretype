
export interface CaughtErrorSuccess< T >
{
	result: T | undefined;
	error: undefined;
}

export interface CaughtErrorFailed
{
	result: undefined;
	error: any;
}

export type CaughtError< T > =
	| CaughtErrorSuccess< T >
	| CaughtErrorFailed;

export async function catchError< R >( fn: ( ) => PromiseLike< R > )
: Promise< CaughtError< R > >
{
	try
	{
		const result = await fn( );
		return {
			result,
			error: undefined,
		};
	}
	catch ( error )
	{
		return {
			error,
			result: undefined,
		};
	}
}
