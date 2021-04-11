[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][build-image]][build-url]
[![coverage status][coverage-image]][coverage-url]
[![Language grade: JavaScript][lgtm-image]][lgtm-url]
[![Node.JS version][node-version]][node-url]


# core-types-suretype

This package provides conversion functions between [`core-types`][core-types-github-url] and [`suretype`][suretype-github-url].

*You probably don't want to use this package directly, but rather [`typeconv`][typeconv-github-url] which uses this package to convert between TypeScript, JSON Schema, Open API, GraphQL and suretype.*

This package converts either from core-types *or* JSON Schema, when converting *to* suretype validators. It also converts either to core-types *or* JSON Schema when converting *from* suretype.

When converting to and from JSON Schema (rather than core-types), the *value constraints* are maintained.

It can convert from TypeScript/JavaScript files exporting suretype validators, as long as they are `require()`able (i.e. have all their dependencies installed).


## See

Other conversion packages:
 * [`core-types-ts`][core-types-ts-github-url]
 * [`core-types-json-schema`][core-types-json-schema-github-url]
 * [`core-types-graphql`][core-types-graphql-github-url]


# Contents

 * [Usage](#usage)
   * [core-types to suretype](#core-types-to-suretype)
   * [json-schema to suretype](#json-schema-to-suretype)
   * [suretype to core-types](#suretype-to-core-types)
   * [suretype to json-schema](#suretype-to-json-schema)


# Usage

There are four conversion functions,

`convertCoreTypesToSureType`, `convertJsonSchemaToSureType` converts **to** suretype,

`convertSureTypeToCoreTypes`, `convertSureTypeToJsonSchema` converts **from** suretype.

These do all return a wrapped value, of the type [`ConversionResult`](https://github.com/grantila/core-types#conversion).


## core-types to suretype

```ts
import { convertCoreTypesToSureType } from 'core-types-suretype'

let doc; // This core-types document comes from somewhere

const { data: tsSourceCode } = convertCoreTypesToSureType( doc, opts );
```

You can provide options as a second argument of the type (it's the same type used for converting from JSON Schema, hence the name):

```ts
interface JsonSchemaToSuretypeOptions
{
	warn?: WarnFunction;
	filename?: string;
	sourceFilename?: string;
	userPackage?: string;
	userPackageUrl?: string;
	noDisableLintHeader?: boolean;
	noDescriptiveHeader?: boolean;
	useUnknown?: boolean;
	forwardSchema?: boolean;
	inlineTypes?: boolean;
	exportType?: boolean;
	exportSchema?: boolean;
	exportValidator?: boolean;
	exportEnsurer?: boolean;
	exportTypeGuard?: boolean;
	unsupported?: 'ignore' | 'warn' | 'error';
}
```

These options are all optional.

 * `warn`: A function callback to be used for warnings, defaults to `console.warn`.
 * `filename` The filename to be written to.<br />This is a hint, no file will be written by the conversion function.
 * `sourceFilename`: The name of the source file from which the core-types comes.
 * `userPackage`: The name of the package using this package.
 * `userPackageUrl`: The url to the package using this package.
 * `noDisableLintHeader`: Prevent writing the "disable linting" comment.
 * `noDescriptiveHeader`: Do no write a top-level descriptive comment about the auto-generated file
 * `useUnknown`: Use `unknown` rather than `any` for *any*-types.
 * `forwardSchema`: Forward the JSON Schema, and create an untyped validator schema with the raw JSON Schema under the hood.
 * `inlineTypes`: Inline pretty typescript types aside validator code
 * `exportType`: Export the deduced types (or the pretty types, depending on inlineTypes)
 * `exportSchema`: Export validator schemas
 * `exportValidator`: Export regular validators
 * `exportEnsurer`: Export 'ensurer' validators
 * `exportTypeGuard`: Export type guards (is* validators)
 * `unsupported`: What to do when detecting an unsupported type
   * `ignore`: Ignore (skip) type
   * `warn`: Ignore type, but warn (default)
   * `error`: Throw an error

The `warn` function is of type `WarnFunction` from [`core-types`][core-types-github-url], meaning it takes a message as string, and an optional second argument of type `CoreTypesErrorMeta`, also from [`core-types`][core-types-github-url].


## JSON Schema to suretype

Converting from JSON Schema is almost the same as from core-types;

```ts
import { convertJsonSchemaToSureType } from 'core-types-suretype'

let jsonSchema; // This JSON Schema comes from somewhere

const { data: tsSourceCode } = convertJsonSchemaToSureType( jsonSchema, opts );
```

The `opts` argument is the same as in `convertCoreTypesToSureType`.


## suretype to core-types

```ts
import { convertSureTypeToCoreTypes } from 'core-types-suretype'

let sourceCode; // This source code comes from somewhere

const { data: doc } = await convertSureTypeToCoreTypes( sourceCode, opts );
```

An optional second argument can be provided of the type (this is the same type used to convert to JSON Schema, hence the name):

```ts
interface SuretypeToJsonSchemaOptions
{
	warn?: WarnFunction;
	filename?: string;
	sourceFilename?: string;
	userPackage?: string;
	userPackageUrl?: string;
	refMethod?: 'no-refs' | 'provided' | 'ref-all';
	nameConflict?: 'rename' | 'warn' | 'error';
}
```

 * `warn`: The same warn function as in [CoreTypesToGraphqlOptions](#core-types-to-graphql)
 * `filename` The filename to be written to.<br />This is a hint, no file will be written by the conversion function.
 * `sourceFilename`: The name of the source file from which the core-types comes.
 * `userPackage`: The name of the package using this package.
 * `userPackageUrl`: The url to the package using this package.
 * `refMethod`: How to handle references to non-exported types
   * `no-refs`: Don't ref anything. Inline all types to monolith types.
   * `provided`: Reference types that are explicitly provided.
   * `ref-all`: Ref all provided types and those with names, suretype()'d.
 * `nameConflict`: What to do when detecting a name conflict
   * `rename`: Try to rename type
   * `warn`: Ignore type, but warn
   * `error`: Throw an error


## suretype to JSON Schema

```ts
import { convertSureTypeToJsonSchema } from 'core-types-suretype'

let sourceCode; // This source code comes from somewhere

const { data: jsonSchema } = await convertSureTypeToJsonSchema( sourceCode, opts );
```

The optional `opts` argument is the same as in `convertSureTypeToCoreTypes`.



[npm-image]: https://img.shields.io/npm/v/core-types-suretype.svg
[npm-url]: https://npmjs.org/package/core-types-suretype
[downloads-image]: https://img.shields.io/npm/dm/core-types-suretype.svg
[build-image]: https://img.shields.io/github/workflow/status/grantila/core-types-suretype/Master.svg
[build-url]: https://github.com/grantila/core-types-suretype/actions?query=workflow%3AMaster
[coverage-image]: https://coveralls.io/repos/github/grantila/core-types-suretype/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/core-types-suretype?branch=master
[lgtm-image]: https://img.shields.io/lgtm/grade/javascript/g/grantila/core-types-suretype.svg?logo=lgtm&logoWidth=18
[lgtm-url]: https://lgtm.com/projects/g/grantila/core-types-suretype/context:javascript
[node-version]: https://img.shields.io/node/v/core-types-suretype
[node-url]: https://nodejs.org/en/

[suretype-github-url]: https://github.com/grantila/suretype
[typeconv-github-url]: https://github.com/grantila/typeconv
[core-types-github-url]: https://github.com/grantila/core-types
[core-types-ts-github-url]: https://github.com/grantila/core-types-ts
[core-types-graphql-github-url]: https://github.com/grantila/core-types-graphql
[core-types-json-schema-github-url]: https://github.com/grantila/core-types-json-schema
