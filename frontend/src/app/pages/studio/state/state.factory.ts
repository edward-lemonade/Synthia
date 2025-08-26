import { signal, WritableSignal } from "@angular/core";
import { StateService } from "./state.service";
import { Author, isAuthor, isTimeSignature, Key, ProjectState, TimeSignature } from "@shared/types";
import { produceWithPatches } from "immer";
import { DefaultState } from "./state.defaults";
import { SignalMutator } from "./state.mutators";

export type Primitive = string | number | boolean | Date | TimeSignature | Author | Array<Primitive>;
export function isPrimitive(value: any): value is Primitive {
	return (typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value instanceof Date ||
			isTimeSignature(value) ||
			isAuthor(value) ||
			value === null ||
			value === undefined);
}

export type WritableStateSignal<T> = WritableSignal<T> & {
	setSilent: (value: T) => void;
	updateSilent: (updateFn: (value: T) => T) => void;
};
export interface ArrayHelpers<T> {
	push(...items: T[]): void;
	splice(start: number, deleteCount?: number, ...items: T[]): T[];
	delete(index: number): void;
}
export interface StateHelpers {
	getParent(): StateNode<any> | undefined;
	getKey(): string | number | undefined;
	getPath(): (string | number)[];
	snapshot(): any;
	allowsUndoRedo(): boolean;
}
export type StateNode<T> = (
	[T] extends [Primitive] ? 		StateHelpers & WritableStateSignal<T> : 
	[T] extends [Array<infer U>] ? 	StateHelpers & WritableStateSignal<StateNode<U>[]> & ArrayHelpers<U> :
	[T] extends [object] ? 			StateHelpers & { [K in keyof T]: StateNode<T[K]> } : 
	never
);

// Leaf nodes
export function stateSignal<T extends Primitive>(
	initial: T,
	stateService: StateService,
	allowUndoRedo: boolean = true,
	customMutate: SignalMutator<T, T>,
	parent?: StateNode<any>,
	key?: string | number,
): StateHelpers & WritableStateSignal<T> {
	const s = signal(initial) as StateHelpers & WritableStateSignal<T>;

	s.getParent = () => parent;
	s.getKey = () => key;
	s.getPath = () => parent ? [...parent.getPath(), key!] : key !== undefined ? [key] : [];
	s.snapshot = () => { return s() };
	s.allowsUndoRedo = () => allowUndoRedo;

	const internalSet = s.set.bind(s);
	const internalUpdate = s.update.bind(s);

	let mutate: SignalMutator<T, T> = ((internalFn: () => void, currentValue: T, newValue: T, stateNode: StateNode<T>) => {
		const currentState = stateService.state.snapshot() as ProjectState;
		internalFn();
		
		if (allowUndoRedo && stateService.historyService) {
			const path = s.getPath();
			
			const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: any) => {
				let target = draft;
				for (let i = 0; i < path.length - 1; i++) { 
					target = target[path[i]]; 
				}
				
				const lastKey = path[path.length - 1];
				target[lastKey] = s.snapshot();
			});

			if (patches && patches.length > 0) {
				stateService.historyService.recordPatch(patches, inversePatches, allowUndoRedo);
			}
		}
	});
	mutate = customMutate ?? mutate;

	Object.assign(s, {
		set(newValue: T) {
			const currentValue = s();
			if (newValue !== currentValue) {
				mutate(() => internalSet(newValue), currentValue, newValue, s as StateNode<T>);
			}
		},
		update(updateFn: (value: T) => T) {
			const currentValue = s();
			const newValue = updateFn(currentValue);
			if (newValue !== currentValue) {
				mutate(() => internalUpdate(updateFn), currentValue, newValue, s as StateNode<T>);
			}
		},
		setSilent(newValue: T) {
			internalSet(newValue);
		},
		updateSilent(updateFn: (value: T) => T) {
			internalUpdate(updateFn);
		},
	});

	return s;
}

// Array nodes
export function stateSignalArray<T extends Record<string,any>>(
	initial: T[],
	stateService: StateService,
	allowUndoRedo = true,
	customMutate: SignalMutator<StateNode<T>[], T>,
	parent?: StateNode<any>,
	key?: string | number,
): StateHelpers & WritableStateSignal<StateNode<T>[]> & ArrayHelpers<T> {
	const s = signal([] as StateNode<T>[]) as StateHelpers & WritableStateSignal<StateNode<T>[]> & ArrayHelpers<T>;

	s.set(initial.map((v, idx) => stateNode(v, stateService, allowUndoRedo, s, idx)));

	s.getParent = () => parent;
	s.getKey = () => key;
	s.getPath = () => parent ? [...parent.getPath(), key!] : key !== undefined ? [key] : [];
	s.snapshot = () => s().map(v => { return v.snapshot() });
	s.allowsUndoRedo = () => allowUndoRedo;

	const internalSet = s.set.bind(s);
	const internalUpdate = s.update.bind(s);

	let mutate: SignalMutator<StateNode<T>[], T> = (internalFn: () => void, currentValue: StateNode<T>[], newValue: StateNode<T>[], stateNode: StateNode<T>) => {
		const currentState = stateService.state.snapshot() as ProjectState;
		internalFn();
		
		if (allowUndoRedo && stateService.historyService) {
			const path = s.getPath();
			
			const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: any) => {
				let target = draft;
				for (let i = 0; i < path.length - 1; i++) { 
					target = target[path[i]]; 
				}
				
				const lastKey = path[path.length - 1];
				target[lastKey] = s.snapshot();
			});

			if (patches && patches.length > 0) {
				stateService.historyService.recordPatch(patches, inversePatches, allowUndoRedo);
			}
		}
	};
	mutate = customMutate ?? mutate;

	s.push = function(...items: T[]) {
		this.update(arr => {
			let newNodes = items.map((v, idx) => stateNode(v, stateService, allowUndoRedo, s, s().length + idx));
			return [...arr, ...newNodes]
		});
	};
	s.splice = function(start: number, deleteCount = 0, ...items: T[]) {
		let deleted: T[] = [];
		this.update(arr => {
			let newNodes = items.map((v, idx) => stateNode(v, stateService, allowUndoRedo, s, s().length + idx));
			const copy = [...arr];
			deleted = copy.splice(start, deleteCount, ...newNodes).map(n => n.snapshot());
			copy.forEach((el, idx) => {
				el.getKey = () => idx;
			});
			return copy;
		});
		return deleted;
	};
	s.delete = function(index: number) {
		this.update(arr => {
			const newArr = arr.filter((_, i) => i !== index);
			newArr.forEach((el, idx) => {
				el.getKey = () => idx;
			});
			return newArr;
		});
	};

	Object.assign(s, {
		set(newValue: StateNode<T>[]) {
			const currentValue = s();
			if (currentValue !== newValue) {
				internalSet(newValue);
				mutate(() => internalSet(newValue), currentValue, newValue, this as StateNode<T>);
			}
		},
		update(updateFn: (value: StateNode<T>[]) => StateNode<T>[]) {
			const currentValue = s();
			const newValue = updateFn(currentValue);
			if (currentValue !== newValue) {
				internalUpdate(updateFn);
				mutate(() => internalUpdate(updateFn), currentValue, newValue, this as StateNode<T>);
			}
		},
		setSilent(newValue: StateNode<T>[]) {
			internalSet(newValue);
		},
		updateSilent(updateFn: (value: StateNode<T>[]) => StateNode<T>[]) {
			internalUpdate(updateFn);
		},
	});

	return s;
}

// Recursive builder
export function stateNode<T extends Record<string, any>>(
	initial: T,
	stateService: StateService,
	allowUndoRedo: boolean = true,
	parent?: StateNode<any>,
	key?: string | number
): StateNode<T> {
	const obj: any = {};

	obj.getParent = () => parent;
	obj.getKey = () => key;
	obj.getPath = () => parent ? [...parent.getPath(), key!] : key !== undefined ? [key] : [];
	obj.snapshot = () => {
		const result: any = {};
		for (const k in obj) {
			if (k !== 'getParent' && k !== 'getKey' && k !== 'getPath' && k !== 'snapshot') {
				const value = obj[k];
				result[k] = value?.snapshot ? value.snapshot() : value();
			}
		}
		return result;
	};

	allowUndoRedo = (initial as DefaultState<any> | null | undefined)?._U ?? allowUndoRedo;

	for (const k in initial) {
		const value = initial[k];
		const customMutate = (initial as DefaultState<any>)?._M?.[k] ?? null;

		if (isPrimitive(value)) {
			obj[k] = stateSignal(value, stateService, allowUndoRedo, customMutate, obj, k);
		} else if (Array.isArray(value)) {
			obj[k] = stateSignalArray(value, stateService, allowUndoRedo, customMutate, obj, k);
		} else if (value !== null && typeof value === 'object') {
			obj[k] = stateNode(value, stateService, allowUndoRedo, obj, k);
		}
	}

	return obj;
}