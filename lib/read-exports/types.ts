import { ExportRefMethod, OnTopLevelNameConflict } from "suretype"
import { JSONSchema7 } from "json-schema"


export interface IpcQuery
{
	file: string;
	refMethod: ExportRefMethod;
	onTopLevelNameConflict: OnTopLevelNameConflict
}

export interface SerializableError
{
	name: string;
	message: string;
	stack?: string;
}

export interface IpcResponseFailed
{
	ok: false;
	error: SerializableError;
	jsonSchema?: never;
}

export interface IpcResponseSuccess
{
	ok: true;
	error?: never;
	jsonSchema: JSONSchema7;
}

export type IpcResponse =
	| IpcResponseFailed
	| IpcResponseSuccess;


export function serializeError( err: any ): SerializableError
{
	return {
		name: err.name ?? 'Error',
		message: err.message ?? err.stack ?? `${err}`,
		stack: err.stack ?? undefined,
	};
}
