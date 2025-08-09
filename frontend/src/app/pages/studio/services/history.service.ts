import { Injectable, inject, computed, signal } from '@angular/core';
import type { Patch } from 'immer';

import { Author } from '@shared/types/Author';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectGlobalsService } from './project-globals.service';
import { ProjectTracksService } from '../services/project-tracks.service';

export interface PatchEntry {
	service: string;
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
	private trackedServices : {
		"metadata": ProjectMetadataService | null,
		"globals": ProjectGlobalsService | null,
		"tracks": ProjectTracksService | null,
	} = {metadata: null, globals: null, tracks: null};
	registerMetadataService(svc: ProjectMetadataService) {this.trackedServices!.metadata = svc;}
	registerGlobalsService(svc: ProjectGlobalsService) {this.trackedServices!.globals = svc;}
	registerTracksService(svc: ProjectTracksService) {this.trackedServices!.tracks = svc;}
	  
	private undoStack: PatchEntry[] = [];
	private redoStack: PatchEntry[] = [];
	private pendingEntries: PatchEntry[] = []; // edits yet to be saved in backend
	private maxHistory = 200; // for undoStack and redoStack

	public isPending = signal<boolean>(this.pendingEntries.length != 0);

	constructor(private auth: AppAuthService,) {}
	
	recordPatch(
		service: string, 
		patches: Patch[], 
		inversePatches: Patch[],
		allowUndoRedo: boolean,
	) {
		const entry: PatchEntry = {
			service,
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

		this.trackedServices[entry.service as keyof typeof this.trackedServices]!.applyPatchesToState(entry.inversePatches);

		this.redoStack.push(entry);
		this.pendingEntries.push(invertPatchEntry(entry));
		this.isPending.set(this.pendingEntries.length != 0);
		return true;
	}

	public redo(): boolean {
		if (this.redoStack.length === 0) return false;
	
		const entry = this.redoStack.pop()!;
	
		this.trackedServices[entry.service as keyof typeof this.trackedServices]!.applyPatchesToState(entry.inversePatches);

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

	// --- optional helpers for debugging / UI ---
	peekUndoStack(): ReadonlyArray<PatchEntry> { return this.undoStack.slice(); }
	peekRedoStack(): ReadonlyArray<PatchEntry> { return this.redoStack.slice(); }
	peekPendingEntries(): ReadonlyArray<PatchEntry> { return this.pendingEntries.slice(); }
	clearHistoryAndPending() {
		this.undoStack.length = 0;
		this.redoStack.length = 0;
		this.pendingEntries.length = 0;
		this.isPending.set(false);
	}
}