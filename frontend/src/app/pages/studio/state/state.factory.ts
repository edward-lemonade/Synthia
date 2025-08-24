import { signal, WritableSignal } from "@angular/core";
import { StateService } from "./state.service";
import { Author, isAuthor, isTimeSignature, Key, ProjectState, TimeSignature } from "@shared/types";
import { produceWithPatches } from "immer";

export type WritableStateSignal<T> = WritableSignal<T> & {
	setSilent: (value: T) => void;
	updateSilent: (updateFn: (value: T) => T) => void;
};

export function stateSignal<T extends Record<string, any>, K extends keyof T>(
	initialValue: T[K],
	key: K,
	stateService: StateService,
): WritableStateSignal<T[K]> {
	const s = signal(initialValue) as WritableStateSignal<T[K]>;

	const internalSet = s.set.bind(s);
	const internalUpdate = s.update.bind(s);

	Object.assign(s, {
		set(newValue: T[K]) {
			const currentValue = s();
			const currentState = stateService.snapshot() as ProjectState;

			if (currentValue !== newValue) {
				internalSet(newValue);

				const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: any) => {
					draft[key] = newValue;
				});
				if (patches && patches.length > 0) {
					stateService.historyService.recordPatch(patches, inversePatches);
				}
			}
		},
		update(updateFn: (value: T[K]) => T[K]) {
			const currentValue = s();
			const newValue = updateFn(currentValue);
			const currentState = stateService.snapshot() as ProjectState;

			if (currentValue !== newValue) {
				internalUpdate(updateFn);

				const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: any) => {
					draft[key] = newValue;
				});
				if (patches && patches.length > 0) {
					stateService.historyService.recordPatch(patches, inversePatches);
				}
			}
		},
		setSilent(newValue: T[K]) {
			internalSet(newValue);
		},
		updateSilent(updateFn: (value: T[K]) => T[K]) {
			internalUpdate(updateFn);
		}
	});

	return s;
}

export type Primitive = string | number | boolean | Date | TimeSignature | Author | null | undefined;
export function isPrimitive(value: any): value is Primitive {
	return (typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value instanceof Date ||
			isTimeSignature(value) ||
			isAuthor(value) ||
			value === null ||
			value === undefined );
}


export type Stateify<T> = (
	[T] extends [Primitive] ? WritableSignal<T> :
	[T] extends [Array<infer U>] ? WritableStateSignal<Stateify<U>[]> :
	[T] extends [object] ? { [K in keyof T]: Stateify<T[K]> } :
	never
);

export function createState<T extends Record<string, any>>(
	initial: T,
	stateService: StateService
): Stateify<T> {
	const obj: any = {};

	for (const key in initial) {
		const value = initial[key];

		if (isPrimitive(value)) {
			obj[key] = stateSignal(initial[key], key, stateService);
		} else if (Array.isArray(value)) {
			obj[key] = stateSignal(
				(value as unknown[]).map(v =>
					typeof v === 'object' && v !== null
					? createState(v, stateService)
					: v
				),
				key,
				stateService
			);
		} else if (value !== null && typeof value === 'object') {
			obj[key] = createState(value, stateService);
		}
	}

	return obj;
}
