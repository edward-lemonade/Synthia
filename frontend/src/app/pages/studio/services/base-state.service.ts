import { Injectable, signal, computed, Signal, WritableSignal } from '@angular/core';
import { applyPatches, Patch, produceWithPatches } from 'immer';

import { HistoryService } from './history.service';

type SignalMap = Record<string, WritableSignal<any>>; 

export class BaseStateService<T extends Record<string, any>> {
	private historyService: HistoryService;

	readonly signals: Record<keyof T, WritableSignal<any>>;
	readonly state: Signal<T>;

	constructor(
		historyService: HistoryService,
		defaults: Record<keyof T, T[keyof T]>,
	) {
		this.historyService = historyService

		this.signals = {} as Record<keyof T, WritableSignal<any>>;
		for (const key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				this.signals[key] = signal(defaults[key]);
			}
		}

		this.state = computed(() => {
			const state: any = {};
			for (const key in this.signals) {
				state[key] = this.signals[key]();
			}
			return state as T;
		});

		return this;
	}

	protected setState<Key extends keyof T>(
		key: Key, 
		value: T[Key],
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
		for (const key in newState) {
			this.setState(key, newState[key]);
		}
	}

	applyPatchesToState(patches: Patch[] | null): T {
		if (!patches || patches.length === 0) return this.state();

		const current = this.state();
		const next = applyPatches(current, patches);

		for (const key in next) {
			this.setState(key, next[key]);
		}

		return this.state();
	}
}
