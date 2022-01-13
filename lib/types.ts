import type { WarnFunction } from 'core-types'
import type { ExportRefMethod } from 'suretype'
import type { Options as AjvOptions } from 'ajv'

type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value | undefined ? P : never]: T[P]
}

export interface JsonSchemaToSuretypeOptions
{
	warn?: WarnFunction;

	/**
	 * The name of the file the result will be written to
	 */
	filename?: string;

	/**
	 * The name of the source file used to convert to TypeScript
	 */
	sourceFilename?: string;

	/**
	 * Use `unknown` instead of `any` for any-types.
	 *
	 * @default true
	 */
	useUnknown?: boolean;

	/**
	 * The name of the package using this package to perform the conversion
	 */
	userPackage?: string;

	/**
	 * The url to the package using this package
	 */
	userPackageUrl?: string;

	/**
	 * Set to true to prevent writing the "disable linting" comment
	 */
	noDisableLintHeader?: boolean;

	/**
	 * Set to true to not write a top-level descriptive comment about the
	 * auto-generated file
	 */
	noDescriptiveHeader?: boolean;


	/**
	 * Forward the JSON Schema, and create an untyped validator schema with
	 * the raw JSON Schema under the hood.
	 *
	 * Typings will still be created, and the validators will coerce to them.
	 *
	 * @default false
	 */
	forwardSchema?: boolean;

	/**
	 * Inline pretty typescript types aside validator code
	 *
	 * This defaults to true, and is forced to true if forwardSchema is true
	 *
	 * @default true
	 */
	inlineTypes?: boolean;

	/**
	 * Export the deduced types (or the pretty types, depending on inlineTypes)
	 *
	 * @default true
	 */
	exportType?: boolean;

	/**
	 * Export validator schemas
	 *
	 * @default true
	 */
	exportSchema?: boolean;

	/**
	 * Export regular validators
	 *
	 * @default true
	 */
	exportValidator?: boolean;

	/**
	 * Export 'ensurer' validators
	 *
	 * @default true
	 */
	exportEnsurer?: boolean;

	/**
	 * Export type guards (is* validators)
	 *
	 * @default true
	 */
	exportTypeGuard?: boolean;

  /**
   * Subset of AJV options that can be set for all compile calls
   */
  ajvOptions?: PickByType<AjvOptions, boolean | string>

	/**
	 * What to do when detecting an unsupported type
	 *
	 *  - `ignore`: Ignore; skip type or cast to any
	 *  - `warn`: Same as 'ignore', but warn (default)
	 *  - `error`: Throw an error
	 */
	unsupported?: 'ignore' | 'warn' | 'error';


	/**
	 * What to do when detecting an unresolvable reference
	 *
	 *  - `ignore`: Ignore; skip type or cast to any
	 *  - `warn`: Same as 'ignore', but warn (default)
	 *  - `error`: Throw an error
	 */
	missingReference?: 'ignore' | 'warn' | 'error';
}

export interface SuretypeToJsonSchemaOptions
{
	warn?: WarnFunction;


	/**
	 * The name of the file the result will be written to
	 */
	filename?: string;

	/**
	 * The name of the source file used to convert to TypeScript
	 */
	sourceFilename?: string;

	/**
	 * The name of the package using this package to perform the conversion
	 */
	userPackage?: string;

	/**
	 * The url to the package using this package
	 */
	userPackageUrl?: string;

	refMethod?: ExportRefMethod;

	/**
	 * What to do when detecting name conflicts
	 *
	 *  - `rename`: Try to rename type
	 *  - `warn`: Ignore type, but warn
	 *  - `error`: Throw an error (default)
	 */
	nameConflict?: 'rename' | 'warn' | 'error';
}
