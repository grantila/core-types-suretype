import { v, suretype, compile, TypeOf } from 'suretype'


const userSchema = suretype(
	{
		name: 'User',
		title: 'The user type',
		description: 'A user representation',
		examples: [ '{ firstName: "joe", id: "12345678" }' ],
	},
	v.object( {
		firstName: v.string( ).required( ),
		id: v.string( ).minLength( 8 ).required( ),
	} )
);

export const ensureUser = compile( userSchema, { ensure: true } );

export type User = TypeOf< typeof userSchema >;

export const ChatLine = suretype(
	{
		name: 'ChatLine',
		title: 'A chat line',
	},
	v.object( {
		line: v.string( ).required( ),
		user: userSchema,
	} )
);
