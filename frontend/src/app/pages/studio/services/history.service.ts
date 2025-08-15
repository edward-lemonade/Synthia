import { Injectable, inject, computed, signal, untracked } from '@angular/core';
import type { Patch } from 'immer';

import { Author } from '@shared/types/Author';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { ProjectState } from './project-state.service';

export interface PatchEntry {
	substate: string;
	patches: Patch[] | null;          // forward patches (current -> next)
	inversePatches: Patch[] | null;   // inverse patches (next -> current)
	timestamp: number;
	author?: Author;
}
function invertPatchEntry(entry: PatchEntry) {
	return {
		...entry,
		patches: entry.inversePatches?.slice() ?? null,       // forward patches to send to server
		inversePatches: entry.patches?.slice() ?? null,       // inverse to allow redo
		timestamp: Date.now(),
	};
}


@Injectable()
export class HistoryService {
	private projectState: ProjectState | null = null;
	registerProjectState(p: ProjectState) {this.projectState! = p;}
	  
	private undoStack: PatchEntry[] = [];
	private redoStack: PatchEntry[] = [];
	private pendingEntries: PatchEntry[] = []; // edits yet to be saved in backend
	private maxHistory = 200; // for undoStack and redoStack

	public isPending = signal<boolean>(this.pendingEntries.length != 0);

	constructor(private auth: AppAuthService,) {}
	
	recordPatch(
		substate: string, 
		patches: Patch[], 
		inversePatches: Patch[],
		allowUndoRedo: boolean,
	) {
		const entry: PatchEntry = {
			substate: substate,
			patches: patches.slice(),
			inversePatches: (inversePatches || []).slice(),
			timestamp: Date.now(),
			author: this.auth.getAuthor()!
		};
	
		if (allowUndoRedo) {
			this.undoStack.push(entry);
			this.redoStack.length = 0;
			if (this.undoStack.length > this.maxHistory) { this.undoStack.shift(); }
		}
	
		this.pendingEntries.push(entry); // for incremental save
		this.isPending.set(this.pendingEntries.length != 0);
	}

	public undo(): boolean {
		if (this.undoStack.length === 0) return false;
	
		const entry = this.undoStack.pop()!;

		this.projectState!.applyPatchEntry(entry, true);
		
		this.redoStack.push(entry);
		this.pendingEntries.push(entry);
		this.isPending.set(this.pendingEntries.length != 0);

		return true;
	}

	public redo(): boolean {
		if (this.redoStack.length === 0) return false;
	
		const entry = this.redoStack.pop()!;
	
		this.projectState!.applyPatchEntry(entry, false);

		this.undoStack.push(entry);
		this.pendingEntries.push(entry);
		this.isPending.set(this.pendingEntries.length != 0);

		return true;
	}

	getPendingEntriesAndClear(): PatchEntry[] {
		const out = this.pendingEntries.slice();
		this.pendingEntries.length = 0;
		this.isPending.set(false);
		return out;
	}

	fillPendingEntries(entries: PatchEntry[]) { // for restoring if save fails
		this.pendingEntries = entries.concat(this.pendingEntries);
		this.isPending.set(this.pendingEntries.length != 0);
	}
}