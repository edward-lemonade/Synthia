import { Injectable, signal, computed, Signal, WritableSignal } from '@angular/core';
import { applyPatches, Patch, produceWithPatches } from 'immer';

type WritableSignalsMap<T> = {
	[K in keyof T]: WritableSignal<T[K]>;
};

export class SignalStateService<T extends object> {
	private readonly signals: WritableSignalsMap<T>;
	readonly state: Signal<T>;

	ALL_KEYS!: (keyof T)[];

	constructor(private defaults: T) {
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

		for (const key of this.ALL_KEYS) {
			Object.defineProperty(this, key, {
				configurable: true,
				enumerable: true,
				get: () => this.signals[key],
				set: (v: T[keyof T]) => {
					this.setState(key, v, true);
				}
			});
		}
	}

	private setState<K extends keyof T>(key: K, value: T[K], makePatch = false): Patch[] | null {
		if (!makePatch) {
			this.signals[key].set(value);
			return null;
		}

		const currentState = this.state();
		const [_, patches] = produceWithPatches(currentState, (draft: T) => {
			draft[key] = value;
		});

		this.signals[key].set(value);

		return patches && patches.length > 0 ? patches : null;
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
