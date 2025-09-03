import { computed, effect, Injectable, Injector, runInInjectionContext, signal } from "@angular/core";
import { RegionService } from "./region.service";
import { BoxSelectBounds } from "./region-select.service";
import { CabnetService } from "./cabnet.service";
import { MidiNote, MidiRegion } from "@shared/types";
import { ObjectStateNode } from "../state/state.factory";
import { v4 as uuid } from "uuid";
import { MidiService } from "./midi.service";
import { TracksService } from "./tracks.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

export interface NotePath {
	regionId: string,
	noteId: string,
}

@Injectable()
export class MidiSelectService { // SINGLETON
	private static _instance: MidiSelectService;
	static get instance(): MidiSelectService { return MidiSelectService._instance; }

	constructor(private injector: Injector) {
		MidiSelectService._instance = this;

		runInInjectionContext(injector, () => {
			effect(() => {
				const notes = this.selectedNotes();
				this.cleanupSelectedRegions();
			})
		})
	}

	get track() { return CabnetService.instance.currentTrackNode }

	// ========================================================
	// FIELDS

	readonly selectedNotes = signal<NotePath[]>([]);
  	readonly hasSelectedNotes = computed(() => this.selectedNotes().length > 0);
  	readonly selectedNotesCount = computed(() => this.selectedNotes().length);

	readonly leftmostSelectedNote = computed(() => {
		const selectedNotes = this.selectedNotes().map(path => MidiService.instance.getNote(path));
		return selectedNotes.reduce((leftmost, current) => 
			current.time() < leftmost.time() ? current : leftmost
		);
	});

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	public setSelectedNote(regionId: string, noteId: string | null) {
		if (noteId === null) {
			this.selectedNotes.set([]);
			return;
		}

		const newSelection: NotePath = { regionId, noteId };
		this.selectedNotes.set([newSelection]);
	}
	public setSelectedNotes(notes: NotePath[]) {
		this.selectedNotes.set([...notes]);
	}
	public addSelectedNote(notePath: NotePath) {
		const alreadySelected = this.isNoteSelected(notePath);
		
		if (!alreadySelected) {
			const current = this.selectedNotes();
			const updated = [...current, notePath];
			this.selectedNotes.set(updated);
		}
	}
	public removeSelectedNote(notePath: NotePath) {
		const current = this.selectedNotes();
		const filtered = current.filter(r => 
			!(r.regionId === notePath.regionId && r.noteId === notePath.noteId)
		);
		this.selectedNotes.set(filtered);
	}
	public toggleSelectedNote(notePath: NotePath) {
		const isSelected = this.isNoteSelected(notePath);
		if (isSelected) {
			this.removeSelectedNote(notePath);
		} else {
			this.addSelectedNote(notePath);
		}
	}
	public isNoteSelected(notePath: NotePath): boolean {
		return this.selectedNotes().some(r => 
			r.regionId === notePath.regionId && r.noteId === notePath.noteId
		);
	}
	public clearSelection() {
		this.selectedNotes.set([]);
	}

	// ========================================================
	// BOX SELECTION SYSTEM

	public startBoxSelect(startX: number, startY: number) {
		this.isBoxSelecting.set(true);
		this.boxSelectBounds.set({
			startX,
			startY,
			endX: startX,
			endY: startY
		});
	}

	public updateBoxSelect(endX: number, endY: number) {
		const current = this.boxSelectBounds();
		if (current) {
			this.boxSelectBounds.set({
				...current,
				endX,
				endY
			});
		}
	}

	public shouldNullifyBoxSelect() {
		const bounds = this.boxSelectBounds();
		if (!bounds) {return false}
		const boxWidth = Math.abs(bounds.startX - bounds.endX);
		const boxHeight = Math.abs(bounds.startY - bounds.endY);
		
		const MIN_BOX_SIZE = 5;
		return (boxWidth < MIN_BOX_SIZE && boxHeight < MIN_BOX_SIZE);		
	}

	public completeBoxSelect(getNotesInBounds: (bounds: BoxSelectBounds) => NotePath[]) {
		const bounds = this.boxSelectBounds();
		if (bounds && !this.shouldNullifyBoxSelect()) {
			const regionsInBounds = getNotesInBounds(bounds);
			this.setSelectedNotes(regionsInBounds);
		}
		
		this.isBoxSelecting.set(false);
		this.boxSelectBounds.set(null);
	}

	public cancelBoxSelect() {
		this.isBoxSelecting.set(false);
		this.boxSelectBounds.set(null);
	}

	public getNormalizedBoxBounds(): BoxSelectBounds | null {
		const bounds = this.boxSelectBounds();
		if (!bounds) return null;

		return {
			startX: Math.min(bounds.startX, bounds.endX),
			startY: Math.min(bounds.startY, bounds.endY),
			endX: Math.max(bounds.startX, bounds.endX),
			endY: Math.max(bounds.startY, bounds.endY)
		};
	}

	private cleanupSelectedRegions() {
		const current = this.selectedNotes();
		
		const validSelections = current.filter(selection => {
			const region = this.track()!.regions.getById(selection.regionId) as ObjectStateNode<MidiRegion>;
			return region && region.midiData.getById(selection.noteId);
		});

		if (validSelections.length !== current.length) {
			this.selectedNotes.set(validSelections);
		}
	}

	// ========================================================
	// UTILITY

	getSelectedNotesForRegion(regionId: string): string[] {
		return this.selectedNotes()
		.filter(r => r.regionId === regionId)
		.map(r => r.noteId);
	}
	hasSelectedNotesInRegion(regionId: string): boolean {
		return this.selectedNotes().some(r => r.regionId === regionId);
	}

	// color
	selectedTrackBgColor(color: string) { 
		return color.slice(0, 7) + '10';
	}

}