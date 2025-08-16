import { Injector } from "@angular/core";
import { HistoryService } from "../history.service";

import { signal, WritableSignal } from '@angular/core';
import { produceWithPatches } from 'immer';

export type WritableStateSignal<T> = WritableSignal<T> & {
	setSilent: (value: T) => void;
};

export function stateSignal<T extends Record<string, any>>(
	initialValue: T[keyof T],
	substateType: SignalStateClass<T>,
	key: keyof T,
): WritableStateSignal<T[keyof T]> {
	const s = signal(initialValue) as WritableStateSignal<T[keyof T]>;
	const internalSet = s.set.bind(s);

	Object.assign(s, {
		set(newValue: T[keyof T]) {
			if (substateType.allowUndoRedo && substateType.historyService) {
				const currentValue = s();
				const currentState = substateType.snapshot();

				if (currentValue !== newValue) {
					internalSet(newValue);

					const [_, patches, inversePatches] = produceWithPatches<T>(currentState, (draft: any) => {
						draft[key] = newValue;
					});
					if (patches && patches.length > 0) {
						substateType.historyService.recordPatch(substateType.substateName, patches, inversePatches, substateType.allowUndoRedo);
					}
				}
			}	
		},
		setSilent(newValue: T[keyof T]) {
			internalSet(newValue);
		},
	});

	return s;
}


export type SignalState<T> = { [K in keyof T]: WritableStateSignal<T[K]> }

export class SignalStateClass<T extends Record<string, any>> {
	private _signalKeys: Set<string> = new Set();
	
	constructor(
		private injector: Injector,
		public historyService: HistoryService, // explicitly injected
		initialData: T,
		public substateName: string,
		public allowUndoRedo = true,
	) {
		for (const key in initialData) {
			(this as any)[key] = stateSignal(initialData[key], this, key);
			this._signalKeys.add(key);
		}
	}

	snapshot(): T {
		const result = {} as T;
		for (const key of this._signalKeys) {
			const signalValue = (this as any)[key];
			if (signalValue && typeof signalValue === 'function') {
				result[key as keyof T] = signalValue();
			}
		}
		return result;
	};
}

