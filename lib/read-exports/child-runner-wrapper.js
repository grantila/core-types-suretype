try {
	require( 'ts-node/register/transpile-only' );
}
catch ( err ) { }

require( './child-runner' );
