import { computed, effect, Injectable, Injector, runInInjectionContext, signal } from "@angular/core";
import { BoxSelectBounds } from "./region-select.service";
import { CabnetService } from "./cabnet.service";
import { MidiNote, MidiRegion } from "@shared/types";
import { ObjectStateNode } from "../state/state.factory";
import { MidiService } from "./midi.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

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

	readonly selectedNotes = signal<ObjectStateNode<MidiNote>[]>([]);
  	readonly hasSelectedNotes = computed(() => this.selectedNotes().length > 0);
  	readonly selectedNotesCount = computed(() => this.selectedNotes().length);

	readonly leftmostSelectedNote = computed(() => {
		return this.selectedNotes().reduce((leftmost, current) => 
			current.time() < leftmost.time() ? current : leftmost
		);
	});

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	public setSelectedNote(note: ObjectStateNode<MidiNote>) {
		if (note === null) {
			this.selectedNotes.set([]);
			return;
		}

		this.selectedNotes.set([note]);
	}
	public setSelectedNotes(notes: ObjectStateNode<MidiNote>[]) {
		this.selectedNotes.set([...notes]);
	}
	public addSelectedNote(note: ObjectStateNode<MidiNote>) {
		const alreadySelected = this.isNoteSelected(note);
		
		if (!alreadySelected) {
			const current = this.selectedNotes();
			const updated = [...current, note];
			this.selectedNotes.set(updated);
		}
	}
	public removeSelectedNote(note: ObjectStateNode<MidiNote>) {
		const current = this.selectedNotes();
		const filtered = current.filter(r => 
			!(this.isNoteSelected(note))
		);
		this.selectedNotes.set(filtered);
	}
	public toggleSelectedNote(note: ObjectStateNode<MidiNote>) {
		const isSelected = this.isNoteSelected(note);
		if (isSelected) {
			this.removeSelectedNote(note);
		} else {
			this.addSelectedNote(note);
		}
	}
	public isNoteSelected(note: ObjectStateNode<MidiNote>): boolean {
		return this.selectedNotes().some(r => (r._id === note._id));
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

	public completeBoxSelect(getNotesInBounds: (bounds: BoxSelectBounds) => ObjectStateNode<MidiNote>[]) {
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
		
		const validSelections = current.filter(note => {
			const region = note.gp() as ObjectStateNode<MidiRegion>;
			return region && region.midiData.getById(note._id);
		});

		if (validSelections.length !== current.length) {
			this.selectedNotes.set(validSelections);
		}
	}

	// ========================================================
	// UTILITY

	selectedTrackBgColor(color: string) { 
		return color.slice(0, 7) + '10';
	}

}