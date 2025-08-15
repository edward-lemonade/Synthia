import { signal, WritableSignal } from '@angular/core';
import { SignalStateClass } from '../services/project-state.service';
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
		setSilent(value: T[keyof T]) {
			internalSet(value);
		},
	});

	return s;
}
