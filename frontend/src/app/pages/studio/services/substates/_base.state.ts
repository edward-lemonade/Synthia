import { Injector, Signal } from "@angular/core";
import { HistoryService } from "../history.service";

import { signal, WritableSignal } from '@angular/core';
import { applyPatches, Patch, produceWithPatches } from 'immer';

export type WritableStateSignal<T> = WritableSignal<T> & {
	setSilent: (value: T) => void;
};

export function stateSignal<T extends Record<string, any>>(
	initialValue: T[keyof T],
	substate: SignalStateClass<T>,
	key: keyof T,
): WritableStateSignal<T[keyof T]> {
	const s = signal(initialValue) as WritableStateSignal<T[keyof T]>;
	const internalSet = s.set.bind(s);

	Object.assign(s, {
		set(newValue: T[keyof T]) {
			const currentValue = s();
			const currentState = substate.snapshot();

			if (currentValue !== newValue) {
				internalSet(newValue);

				const [_, patches, inversePatches] = produceWithPatches<T>(currentState, (draft: any) => {
					draft[key] = newValue;
				});
				if (patches && patches.length > 0) {
					substate.historyService.recordPatch(patches, inversePatches, substate.allowUndoRedo);
				}
			}
		},
		setSilent(newValue: T[keyof T]) {
			internalSet(newValue);
		},
	});

	return s;
}


export type SignalState<T extends Record<string, any>> = { [K in keyof T]: (
	T[K] extends (infer U extends Record<string, any>)[] 	? SignalStateArray<U> :
	T[K] extends Record<string, any> 						? SignalStateClass<T[K]> :
	T[K] extends any 										? SignalStateClass<T[K]> : never
)}
export class SignalStateClass<T extends Record<string, any>> {
	protected _signalKeys: Set<string> = new Set();
	protected _arrStateKeys: Set<string> = new Set();
	protected _objStateKeys: Set<string> = new Set();
	
	constructor(
		private injector: Injector,
		public historyService: HistoryService,
		initialData: T,
		public allowUndoRedo = true,
	) {
		for (const key in initialData) {
			const value = initialData[key];
			
			if (this.isObject(value)) {
				(this as any)[key] = new SignalStateClass(
					injector, 
					historyService, 
					value, 
					allowUndoRedo
				);
				this._objStateKeys.add(key);

			} else if (this.isArrayOfObjects(value)) {
				(this as any)[key] = new SignalStateArray<T[typeof key]>(
					injector, 
					historyService, 
					value,
					allowUndoRedo
				)
				/*
				(this as any)[key] = value.map((item: any, index: number) => 
					new SignalStateClass(
						injector, 
						historyService, 
						item, 
						allowUndoRedo
					)
				) as Record<keyof T, SignalStateClass<T>>;*/
				this._arrStateKeys.add(key);

			} else {
				(this as any)[key] = stateSignal(value, this, key);
				this._signalKeys.add(key);
			}
		}
	}

	private isObject(value: any): boolean {
		return value !== null && 
			typeof value === 'object' && 
			!Array.isArray(value) && 
			Object.getPrototypeOf(value) === Object.prototype;
	}

	private isArrayOfObjects(value: any): boolean {
		return Array.isArray(value) && 
			   value.length > 0 && 
			   value.every(item => this.isObject(item));
	}

	snapshot(): T {
		const result = {} as T;
		
		for (const key of this._signalKeys) {
			const signalValue = (this as any)[key];
			result[key as keyof T] = signalValue();
		}
		
		for (const key of this._arrStateKeys) {
			const nestedValue = (this as any)[key] as SignalStateArray<T[typeof key]>;
			result[key as keyof T] = nestedValue.map(item => item.snapshot()) as any;
		}

		for (const key of this._objStateKeys) {
			const nestedValue = (this as any)[key];
			result[key as keyof T] = nestedValue.snapshot();
		} 
		
		return result;
	}

	clone(): SignalStateClass<T> {
		return new SignalStateClass(this.injector, this.historyService, this.snapshot(), this.allowUndoRedo);
	}

	loadState(newState: T): void {
		for (const key of this._signalKeys) {
			if (key in newState) {
				const signal = (this as any)[key];
				signal.setSilent(newState[key as keyof T]);
			}
		}

		for (const key of this._arrStateKeys) {
			const newValue = newState[key as keyof T];
			const currentValue = (this as any)[key];

			if (Array.isArray(newValue) && Array.isArray(currentValue)) {
				const minLength = Math.min(newValue.length, currentValue.length);
				for (let i = 0; i < minLength; i++) {
					currentValue[i].loadState(newValue[i]);
				}

				if (newValue.length > currentValue.length) {
					for (let i = currentValue.length; i < newValue.length; i++) {
						currentValue.push(new SignalStateClass(
							this.injector,
							this.historyService,
							newValue[i],
							this.allowUndoRedo,
						));
					}
				} else if (newValue.length < currentValue.length) {
					currentValue.splice(newValue.length);
				}

			}
		}

		for (const key of this._objStateKeys) {
			const newValue = newState[key as keyof T];
			const currentValue = (this as any)[key];
			if (currentValue && typeof currentValue.loadState === 'function') {
				currentValue.loadState(newValue);
			}
		}
	}

	loadPatch(patch: Patch): void {
		const { op, path, value } = patch;

		if (!Array.isArray(path) || path.length === 0) { return; } // nothing path
		let target: any = this;
		for (let i = 0; i < path.length - 1; i++) {
			const segment = path[i];
			target = target[segment];
			if (target === undefined) break;
		}
		const key = path[path.length - 1] as any;
		if (target === undefined) { return; } // invalid path 

		switch (op) {
			case "replace": {
				const current = target[key];
				if (current && typeof current.setSilent === "function") {
					current.setSilent(value);
				} else if (current instanceof SignalStateClass) {
					current.loadPatch({ op: "replace", path: [], value });
				} else if (Array.isArray(target)) {
					target[key] = new SignalStateClass(
						this.injector,
						this.historyService,
						value,
						this.allowUndoRedo
					);
				}
				break;
			}

			case "add": {
				if (Array.isArray(target)) {
					if (this.isObject(value)) {
						target.splice(
							key,
							0,
							new SignalStateClass(
								this.injector,
								this.historyService,
								value,
								this.allowUndoRedo
							)
						);
					} else {
						target.splice(key, 0, value);
					}
				} else {
					target[key] = new SignalStateClass(
						this.injector,
						this.historyService,
						value,
						this.allowUndoRedo
					);
				}
				break;
			}

			case "remove": {
				if (Array.isArray(target)) {
					target.splice(key, 1);
				} else {
					delete target[key];
				}
				break;
			}
		}
		
	}
}

export class SignalStateArray<T extends Record<string, any>> extends Array<SignalStateClass<T>> {
	private _lengthSignal = signal(0);

	get lengthSignal() { return this._lengthSignal.asReadonly(); }

	constructor(
		private injector: Injector,
		private historyService: HistoryService,
		items: T[] = [],
		private allowUndoRedo = true
	) {
		super(...items.map(item => new SignalStateClass(injector, historyService, item, allowUndoRedo)));

		this._lengthSignal.set(this.length);
		Object.setPrototypeOf(this, SignalStateArray.prototype); // fix prototype chain
	}

	private updateLength() {
		this._lengthSignal.set(this.length);
	}

	override push(...items: (SignalStateClass<T> | T)[]): number {
		const instances = items.map(item => item instanceof SignalStateClass
			? item
			: new SignalStateClass<T>(this.injector, this.historyService, item, this.allowUndoRedo)
		);
  		const result = super.push(...instances);
		this.updateLength();
		return result;
	}	

	override pop(): SignalStateClass<T> | undefined {
		const result = super.pop();
		this.updateLength();
		return result;
	}

	override shift(): SignalStateClass<T> | undefined {
		const result = super.shift();
		this.updateLength();
		return result;
	}

	override unshift(...items: (SignalStateClass<T> | T)[]): number {
		const instances = items.map(item => item instanceof SignalStateClass
			? item
			: new SignalStateClass<T>(this.injector, this.historyService, item, this.allowUndoRedo)
		);
		const result = super.unshift(...instances);
		this.updateLength();
		return result;
	}

	override splice(start: number, deleteCount?: number, ...items: (SignalStateClass<T> | T)[]): SignalStateClass<T>[] {
		const instances = items.map(item => item instanceof SignalStateClass
			? item
			: new SignalStateClass<T>(this.injector, this.historyService, item, this.allowUndoRedo)
		);
		const result = super.splice(start, deleteCount ?? 0, ...instances);
		this.updateLength();
		return result;
	}

	override filter(predicate: (value: SignalStateClass<T>, index: number, array: SignalStateClass<T>[]) => boolean, thisArg?: any): SignalStateArray<T> {
		const filtered = super.filter(predicate, thisArg);
		return new SignalStateArray(
			this.injector,
			this.historyService,
			filtered.map(item => item.snapshot()),
			this.allowUndoRedo
		);
	}
}
