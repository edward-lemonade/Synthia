import { Injectable, inject, computed } from '@angular/core';
import type { Patch } from 'immer';

import { Author } from '@shared/types/Author';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectVarsService } from '../services/project-vars.service';
import { ProjectTracksService } from '../services/project-tracks.service';

import { ProjectState } from '../state/project.state';

type ServiceKey = 'vars' | 'tracks'; // metadata edits aren't tracked so they wont be undo/redo'd

export interface PatchEntry {
	service: ServiceKey;
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
		vars: ProjectVarsService | null,
		tracks: ProjectTracksService | null,
	} = {vars: null, tracks: null};
	registerVarsService(svc: ProjectVarsService) {this.trackedServices!.vars = svc;}
	registerTracksService(svc: ProjectTracksService) {this.trackedServices!.tracks = svc;}
	  
	private undoStack: PatchEntry[] = [];
	private redoStack: PatchEntry[] = [];
	private pendingEntries: PatchEntry[] = []; // edits yet to be saved in backend
	private maxHistory = 200; // for undoStack and redoStack

	constructor(private auth: AppAuthService,) {}
	
	recordPatch(
		service: ServiceKey, 
		patches: Patch[], 
		inversePatches: Patch[]
	) {
		if (!patches || patches.length === 0) return;
	
		const entry: PatchEntry = {
			service,
			patches: patches.slice(),
			inversePatches: (inversePatches || []).slice(),
			timestamp: Date.now(),
			author: this.auth.getAuthor()!
		};
	
		this.undoStack.push(entry);
		this.redoStack.length = 0;
		if (this.undoStack.length > this.maxHistory) { this.undoStack.shift(); }
	
		this.pendingEntries.push(entry); // for incremental save
	}

	undo(): boolean {
		if (this.undoStack.length === 0) return false;
	
		const entry = this.undoStack.pop()!;
		if (entry && (!entry.inversePatches || entry.inversePatches.length === 0)) {
			console.warn('No inverse patches available for undo entry', entry);
			this.redoStack.push(entry);
			return false;
		}

		this.trackedServices[entry.service]!.applyPatchesToState(entry.inversePatches); // apply patch to corresponding service
		this.redoStack.push(entry);
		this.pendingEntries.push(invertPatchEntry(entry));
		return true;
	}

	redo(): boolean {
		if (this.redoStack.length === 0) return false;
	
		const entry = this.redoStack.pop()!;
		if (!entry.patches || entry.patches.length === 0) {
			console.warn('No forward patches available for redo entry', entry);
			this.undoStack.push(entry);
			return false;
		}
	
		this.trackedServices[entry.service]!.applyPatchesToState(entry.patches); // apply patch to corresponding service
		this.undoStack.push(entry);
		this.pendingEntries.push(entry);
		return true;
	}

	getPendingEntriesAndClear(): PatchEntry[] {
		const out = this.pendingEntries.slice();
		this.pendingEntries.length = 0;
		return out;
	}

	fillPendingEntries(entries: PatchEntry[]) { // for restoring if save fails
		this.pendingEntries = entries.concat(this.pendingEntries);
	}

	// --- optional helpers for debugging / UI ---
	peekUndoStack(): ReadonlyArray<PatchEntry> { return this.undoStack.slice(); }
	peekRedoStack(): ReadonlyArray<PatchEntry> { return this.redoStack.slice(); }
	peekPendingEntries(): ReadonlyArray<PatchEntry> { return this.pendingEntries.slice(); }
	clearHistoryAndPending() {
		this.undoStack.length = 0;
		this.redoStack.length = 0;
		this.pendingEntries.length = 0;
	}
}