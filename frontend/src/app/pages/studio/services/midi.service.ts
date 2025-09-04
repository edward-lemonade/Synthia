import { computed, Injectable, Injector, signal } from "@angular/core";
import { RegionService } from "./region.service";
import { BoxSelectBounds } from "./region-select.service";
import { CabnetService } from "./cabnet.service";
import { MidiNote, MidiRegion } from "@shared/types";
import { ObjectStateNode } from "../state/state.factory";
import { v4 as uuid } from "uuid";
import { MidiSelectService } from "./midi-select.service";
import { ViewportService } from "./viewport.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

@Injectable()
export class MidiService { // SINGLETON
	private static _instance: MidiService;
	static get instance(): MidiService { return MidiService._instance; }

	constructor(
		private injector: Injector,
		private viewportService: ViewportService,
	) {
		MidiService._instance = this;
	}

	get track() {return CabnetService.instance.currentTrackNode}
	getRegion(regionId: string): ObjectStateNode<MidiRegion> { 
		return (this.track()?.regions.getById(regionId) as ObjectStateNode<MidiRegion>)
	}

	editingMode = signal<EditingMode>(0);

	// ==============================================================================================
	// [Draw]

	public readonly SCALES: number = 9;
	public readonly SCALE_HEIGHT: number = 200;
	public readonly ROW_HEIGHT: number = 200/12;
	public readonly MIN_PITCH: number = 1;
	public readonly MAX_PITCH: number = this.SCALES * 12;
	public getNoteLeft(note: ObjectStateNode<MidiNote>): number { return this.viewportService.posToPx(note.start()); }
	public getNoteRight(note: ObjectStateNode<MidiNote>): number { return this.viewportService.posToPx(note.start()+note.duration()); }
	public getNoteBottom(note: ObjectStateNode<MidiNote>): number { return this.getNoteTop(note)+this.ROW_HEIGHT }
	public getNoteTop(note: ObjectStateNode<MidiNote>): number { return this.ROW_HEIGHT * (this.SCALES*12 - note.pitch()) - 1; }
	public pxToPitch(py: number): number { return (this.SCALES*12) - Math.ceil(py / this.ROW_HEIGHT) + 1; }
	public pitchToPx(pitch: number): number { return this.ROW_HEIGHT * (this.SCALES*12 - pitch) - 1; }

	addNote(overrides: Partial<MidiNote> = {}, actionId = uuid()) {
		const props: Partial<MidiNote> = {
			...overrides,
		}
		const region = this.getOrMakeRegionForNote(props.start || 0, props.duration || 1, actionId);
		region.midiData.insertValue(props, undefined, actionId);
	}
	getOrMakeRegionForNote(start: number, duration: number, actionId = uuid()): ObjectStateNode<MidiRegion> {
		let chosenRegionFull = null;
		let chosenRegionPartial = null;
		for (const region of this.track()?.regions.getAll() ?? []) {
			if (region.start() <= start) {
				if (start+duration <= region.start()+region.duration()) {
					chosenRegionFull = region;
					break;
				}
				chosenRegionPartial = region;
			} else {
				break;
			}
		}

		if (chosenRegionFull) {
			return chosenRegionFull as ObjectStateNode<MidiRegion>;
		} else if (chosenRegionPartial) {
			chosenRegionPartial.duration.set(start+duration - chosenRegionPartial.start(), actionId);
			return chosenRegionPartial as ObjectStateNode<MidiRegion>;
		}
		const snappedLeft = this.viewportService.snapFloor(start);
		return RegionService.instance.addMidiRegion(this.track()!, {
			start: snappedLeft,
			duration: duration - snappedLeft,
		}) as ObjectStateNode<MidiRegion>;
	}
	deleteNote(note: ObjectStateNode<MidiNote>, actionId=uuid()) {
		MidiSelectService.instance.removeSelectedNote(note);
		note._parent.remove(note._id, actionId);
	}
	deleteNotes(notes: ObjectStateNode<MidiNote>[], actionId=uuid()) {
		for (const n of notes) { this.deleteNote(n, actionId); }
	}
	transferNoteToRegion(note: ObjectStateNode<MidiNote>, newRegionId: string, actionId = uuid()) {
		const targetRegion = this.getRegion(newRegionId)!;
		
		note._parent.remove(note._id, actionId);
		targetRegion.midiData.push(note, actionId);
	}
	transferNotesToRegion(notes: ObjectStateNode<MidiNote>[], newRegionId: string, actionId = uuid()) {
		notes.forEach(n => {
			this.transferNoteToRegion(n, newRegionId, actionId);
		});
	}
	moveNote(note: ObjectStateNode<MidiNote>, newStart: number, newPitch: number, actionId = uuid()) {
		note.start.set(newStart, actionId);
		note.pitch.set(newPitch, actionId);
	}
	moveNotes(notes: ObjectStateNode<MidiNote>[], startOffset: number, pitchOffset: number, actionId = uuid()) {
		notes.forEach(note => {
			this.moveNote(note, note.start() + startOffset, note.pitch() + pitchOffset, actionId);
		});
	}
	resizeNote(note: ObjectStateNode<MidiNote>, newStart: number, newDuration: number, actionId = uuid()) {		
		note.start.set(newStart, actionId);
		note.duration.set(newDuration, actionId);
	}
	duplicateNote(note: ObjectStateNode<MidiNote>) {
		const duped = { ...note.snapshot() };
		note._parent.insertValue(duped);
	}
}