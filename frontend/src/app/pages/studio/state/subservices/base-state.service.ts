import { Injectable, signal, computed, Signal, WritableSignal } from '@angular/core';
import { applyPatches, Patch, produceWithPatches } from 'immer';

import { HistoryService } from './../../services/history.service';


export abstract class BaseStateService<T extends Record<string, any>> {
	declare allowUndoRedo: boolean; // whether to record changes in history

	declare signals: Record<keyof T, WritableSignal<any>>;
	declare state: Signal<T>;

	constructor(
		private historyService: HistoryService,
		private serviceName: string,
	) {
		this.allowUndoRedo = (serviceName == "globals" || serviceName == "tracks"); // don't allow undo/redo metadata changes
		return this;
	}

	protected init(state: T) {
		this.signals = {} as Record<keyof T, WritableSignal<any>>;
		for (const key in state) {
			this.signals[key] = signal(state[key]);			
		}

		this.state = computed(() => {
			const state: any = {};
			for (const key in this.signals) {
				state[key] = this.signals[key]();
			}
			return state as T;
		});
	}

	get<K extends keyof T>(key: K): Signal<T[K]> {
		return this.signals[key];
	}

	set<Key extends keyof T>(
		key: Key, 
		value: T[Key],
		dontPatch: boolean = false,
	) {
		if (!dontPatch) {
			const currentState = this.state();
			const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: T) => {
				draft[key] = value;
			});
			this.signals[key].set(value);
			if (patches && patches.length > 0) this.historyService.recordPatch(this.serviceName, patches, inversePatches, this.allowUndoRedo)
		} else {
			this.signals[key].set(value);
		}
	}

	applyState(newState: T) {
		for (const key in newState) {
			this.signals[key].set(newState[key]);
		}
	}

	applyPatchesToState(patches: Patch[] | null): T {
		if (!patches || patches.length === 0) return this.state();

		const current = this.state();
		const next = applyPatches(current, patches);

		for (const key in next) {
			this.signals[key].set(next[key]);
		}

		return this.state();
	}
}
