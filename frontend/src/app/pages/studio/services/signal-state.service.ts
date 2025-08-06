import { Injectable, signal, computed, Signal, WritableSignal } from '@angular/core';
import { applyPatches, Patch, produceWithPatches } from 'immer';

import { HistoryService } from './history.service';

type WritableSignalsMap<T> = {
	[K in keyof T]: WritableSignal<T[K]>;
};

export class SignalStateService<T extends object> {
	private historyService: HistoryService;
	private readonly signals: WritableSignalsMap<T>;
	readonly state: Signal<T>;

	ALL_KEYS!: (keyof T)[];

	constructor(
		historyService: HistoryService,
		defaults: T, 
	) {
		this.historyService = historyService

		this.ALL_KEYS = Object.keys(defaults) as (keyof typeof defaults)[];
		const entries = Object.entries(defaults) as [keyof T, T[keyof T]][];

		this.signals = entries.reduce((acc, [key, val]) => {
			(acc as any)[key] = signal(val);
			return acc;
		}, {} as Partial<WritableSignalsMap<T>>) as WritableSignalsMap<T>;

		this.state = computed(() => {
			const out = {} as T;
			for (const k of this.ALL_KEYS) {
				out[k] = this.signals[k]();
			}
			return out;
		});
	}

	protected initProps(
		recordPatches = false,
		service?: "globals" | "tracks"
	) {
		for (const key of this.ALL_KEYS) {
			Object.defineProperty(this, key, {
				configurable: true,
				enumerable: true,
				get: () => this.signals[key],
				set: (v: T[keyof T]) => {
					const ret = this.setState(key, v, true);
					if (recordPatches && ret) { 
						this.historyService.recordPatch(service!, ret.patches, ret.inversePatches)
					}
				}
			});
		}
	}

	protected setState<K extends keyof T>(
		key: K, 
		value: T[K], 
		makePatch = false
	): { patches: Patch[]; inversePatches: Patch[] } | null {
		if (!makePatch) {
			this.signals[key].set(value);
			return null;
		}

		const currentState = this.state();
		const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: T) => {
			draft[key] = value;
		});

		this.signals[key].set(value);
		return patches && patches.length > 0 ? {patches, inversePatches} : null;
	}

	applyState(newState: T) {
		for (const key of this.ALL_KEYS) {
			this.setState(key, newState[key]);
		}
	}

	applyPatchesToState(patches: Patch[] | null): T {
		if (!patches || patches.length === 0) return this.state();

		const current = this.state();
		const next = applyPatches(current, patches);

		for (const key of this.ALL_KEYS) {
			this.setState(key, next[key]);
		}

		return this.state();
	}
}
