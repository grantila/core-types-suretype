import { analyzeTypesFast } from 'json-schema-cycles'
import * as toposort from 'toposort'


export function analyzeSchema( schema: any )
{
	const { graph, cyclic, dependencies, dependents } =
		analyzeTypesFast( schema );

	const cycledSchemas =
		new Set( [ ...cyclic, ...dependencies, ...dependents ] );

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
