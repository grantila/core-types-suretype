// Best-effort to also support .ts files, not officially supported though.
// If it works, it works...
const registerTsNode = async ( ) =>
	{
		try {
			const tsNode = await import( 'ts-node/esm/transpile-only' );
			return tsNode;
		}
		catch ( err ) { }
	};

registerTsNode( )
.then( ( ) =>
{
	import( '../../dist/read-exports/child-runner.js' );
} );
