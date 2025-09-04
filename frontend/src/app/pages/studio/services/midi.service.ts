import { computed, Injectable, Injector, signal } from "@angular/core";
import { RegionService } from "./region.service";
import { BoxSelectBounds } from "./region-select.service";
import { CabnetService } from "./cabnet.service";
import { MidiNote, MidiRegion } from "@shared/types";
import { ObjectStateNode } from "../state/state.factory";
import { v4 as uuid } from "uuid";
import { MidiSelectService } from "./midi-select.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

@Injectable()
export class MidiService { // SINGLETON
	private static _instance: MidiService;
	static get instance(): MidiService { return MidiService._instance; }

	constructor(private injector: Injector) {
		MidiService._instance = this;
	}

	get track() {return CabnetService.instance.currentTrackNode}
	getRegion(regionId: string): ObjectStateNode<MidiRegion> { 
		return (this.track()?.regions.getById(regionId) as ObjectStateNode<MidiRegion>)
	}

	readonly editingMode = signal<EditingMode>(0);

	// ==============================================================================================
	// [Draw]

	addNote(region: ObjectStateNode<MidiRegion>, overrides: Partial<MidiNote> = {}) {
		const props: Partial<MidiNote> = {
			...overrides,
		}
		region.midiData.insertValue(props);
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
	moveNote(note: ObjectStateNode<MidiNote>, newStart: number, actionId = uuid()) {
		note.time.set(newStart, actionId);
	}
	moveNotes(notes: ObjectStateNode<MidiNote>[], startOffset: number, actionId = uuid()) {
		notes.forEach(note => {
			this.moveNote(note, note.time() + startOffset, actionId);
		});
	}
	resizeNote(note: ObjectStateNode<MidiNote>, newStart: number, newDuration: number, actionId = uuid()) {		
		note.time.set(newStart, actionId);
		note.duration.set(newDuration, actionId);
	}
}