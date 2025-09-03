import { computed, Injectable, Injector, signal } from "@angular/core";
import { RegionService } from "./region.service";
import { BoxSelectBounds } from "./region-select.service";
import { CabnetService } from "./cabnet.service";
import { MidiNote, MidiRegion } from "@shared/types";
import { ObjectStateNode } from "../state/state.factory";
import { v4 as uuid } from "uuid";
import { MidiSelectService } from "./midi-select.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

export interface NotePath {
	regionId: string,
	noteId: string,
}

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
	getNote(path: NotePath): ObjectStateNode<MidiNote> {
		return this.getRegion(path.regionId).midiData.getById(path.noteId)!;
	}
	getRegionOfNote(note: ObjectStateNode<MidiNote>) {
		return this.track()?.regions().find(region => {
			const midiRegion = region as ObjectStateNode<MidiRegion>;
			return note._id in midiRegion.midiData._ids;
		}) as ObjectStateNode<MidiRegion> | undefined;
	}

	readonly editingMode = signal<EditingMode>(0);

	// ==============================================================================================
	// [Draw]

	addNote(regionNode: ObjectStateNode<MidiRegion>, overrides: Partial<MidiNote> = {}) {
		const props: Partial<MidiNote> = {
			...overrides,
		}
		regionNode.midiData.insertValue(props);
	}
	deleteNote(path: NotePath, actionId=uuid()) {
		MidiSelectService.instance.removeSelectedNote(path);
		this.getRegion(path.regionId).midiData.remove(path.noteId, actionId);
	}
	deleteNotes(paths: NotePath[], actionId=uuid()) {
		for (const p of paths) { this.deleteNote(p, actionId); }
	}
	transferNoteToRegion(path: NotePath, newRegionId: string, actionId = uuid()) {
		const sourceRegion = this.getRegion(path.regionId)!;
		const targetRegion = this.getRegion(newRegionId)!;
		
		const region = sourceRegion.midiData.remove(path.regionId, actionId);
		targetRegion.midiData.push(region, actionId);
	}
	transferNotesToRegion(paths: NotePath[], newRegionId: string, actionId = uuid()) {
		paths.forEach(path => {
			this.transferNoteToRegion(path, newRegionId, actionId);
		});
	}
	moveNote(path: NotePath, newStart: number, actionId = uuid()) {
		const noteNode = this.getNote(path);
		noteNode.time.set(newStart, actionId);
	}
	moveNotes(paths: NotePath[], startOffset: number, actionId = uuid()) {
		paths.forEach(path => {
			const note = this.getNote(path);
			this.moveNote(path, note.time() + startOffset, actionId);
		});
	}
	resizeNote(path: NotePath, newStart: number, newDuration: number, actionId = uuid()) {
		const noteNode = this.getNote(path);			
		noteNode.time.set(newStart, actionId);
		noteNode.duration.set(newDuration, actionId);
	}
}