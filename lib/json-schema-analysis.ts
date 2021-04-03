import { analyzeTypes } from 'json-schema-cycles'
import * as toposort from 'toposort'


export function analyzeSchema( schema: any )
{
	const { graph, all, dependencies } = analyzeTypes( schema );

	const cycledSchemas = new Set( [ ...dependencies, ...all ] );

	const nonCyclic = graph
		.filter( ( [ from ] ) => !cycledSchemas.has( from ) )
		.flatMap( ( [ from, to ] ): Array< [ string, string | undefined ] > =>
			to.length === 0
			? [ [ from, undefined ] ]
			: to.map( node => [ from, node ] )
		);

	const sorted = toposort( nonCyclic )
		.filter( val => val !== undefined )
		.reverse( )
		.filter( type => !cycledSchemas.has( type ) );

	return { nonCyclic: sorted, cyclic: [ ...cycledSchemas ] };
}
