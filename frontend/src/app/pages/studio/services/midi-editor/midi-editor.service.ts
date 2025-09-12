import { computed, Injectable, Injector, signal } from "@angular/core";
import { RegionService } from "../region.service";
import { BoxSelectBounds, RegionSelectService } from "../region-select.service";
import { CabnetService } from "../cabnet.service";
import { MidiNote, MidiRegion, Region } from "@shared/types";
import { ObjectStateNode } from "../../state/state.factory";
import { v4 as uuid } from "uuid";
import { MidiSelectService } from "./midi-select.service";
import { ViewportService } from "../viewport.service";
import { TracksService } from "../tracks.service";

export enum EditingMode {Select, Draw, Velocity, Erase}

@Injectable()
export class MidiEditorService { // SINGLETON
	private static _instance: MidiEditorService;
	static get instance(): MidiEditorService { return MidiEditorService._instance; }

	constructor(
		private injector: Injector,
		private viewportService: ViewportService,
	) {
		MidiEditorService._instance = this;
	}

	get track() {return CabnetService.instance.selectedTrack}
	getRegion(regionId: string): ObjectStateNode<MidiRegion> { 
		return (this.track()?.regions.getById(regionId) as ObjectStateNode<MidiRegion>)
	}

	editingMode = signal<EditingMode>(0);

	drawNoteLength = computed(() => {
		let unit = this.viewportService.smallestUnit();
		if (!MidiSelectService.instance) {return unit}

		const selected = MidiSelectService.instance.selectedNotes();
		if (selected.length > 0) {
			unit = selected[0].duration();
		}
		return unit;
	})

	// ==============================================================================================
	// [Draw]

	public readonly SCALES: number = 9;
	public readonly SCALE_HEIGHT: number = 200;
	public readonly ROW_HEIGHT: number = 200/12;
	public readonly C1: number = 24;
	public readonly MIN_MIDINOTE: number = this.C1;
	public readonly MAX_MIDINOTE: number = this.C1 + this.SCALES * 12 - 1;
	public getNoteLeft(note: ObjectStateNode<MidiNote>): number { return this.viewportService.posToPx(note.gp().start() + note.start()); }
	public getNoteRight(note: ObjectStateNode<MidiNote>): number { return this.viewportService.posToPx(note.gp().start() + note.start()+note.duration()); }
	public getNoteBottom(note: ObjectStateNode<MidiNote>): number { return this.midiNoteToPx(note.midiNote())+this.ROW_HEIGHT }
	public getNoteTop(note: ObjectStateNode<MidiNote>): number { return this.midiNoteToPx(note.midiNote()); }
	public pxToMidiNote(py: number): number { return (this.SCALES*12) - Math.floor(py / this.ROW_HEIGHT) + this.C1-1; }
	public midiNoteToPx(midiNote: number): number { return this.ROW_HEIGHT * (this.SCALES*12 - (midiNote-this.C1+1)) - 1; }
	public indexToMidiNote(i: number): number { return this.SCALES*12 - i - 1 + this.C1 }

	addNote(overrides: Partial<MidiNote> = {}, actionId = uuid()) {
		let props: Partial<MidiNote> = {
			...overrides,
		}
		const region = this.getOrMakeRegionForNote(props.start || 0, props.duration || 1, actionId);
		props.start = props.start! - region.start(); 
		RegionSelectService.instance.setSelectedRegion(region);
		return region.midiData.insertValue(props, undefined, actionId);
	}
	updateRegionBoundsForNoteBounds(region: ObjectStateNode<Region>, start: number, duration: number, actionId?: string) {
		const newStart = Math.min(region.start(), start);
		const newEnd = Math.max(region.start()+region.duration(), start+duration);
		RegionService.instance.resizeRegion(region, newStart, newEnd-newStart, actionId);
	}
	getOrMakeRegionForNote(start: number, duration: number, actionId = uuid()): ObjectStateNode<MidiRegion> {
		let chosenRegionFull = null;
		let chosenRegionPartial = null;
		if (RegionSelectService.instance.selectedRegions().length == 1) {
			chosenRegionPartial = RegionSelectService.instance.selectedRegions()[0]! as ObjectStateNode<MidiRegion>;
		} else {
			for (const region of this.track()?.regions.getAll() ?? []) {
				const regionStart = region.start()-0.001;
				const regionEnd = regionStart + region.duration()+0.001;
				const end = start + duration;
				if (regionStart <= start && end <= regionEnd) {	 // in			
					chosenRegionFull = region;
					break;
				} else if (regionStart <= start && start <= regionEnd && regionEnd <= end) { // right
					chosenRegionPartial = region;
				} else if (start <= regionStart && regionStart <= end && end <= regionEnd) { // left
					
				} else if (start < regionStart && regionEnd < end) { // overlap
					
				}
			}
		}

		if (chosenRegionFull) {
			return chosenRegionFull as ObjectStateNode<MidiRegion>;
		} else if (chosenRegionPartial) {
			this.updateRegionBoundsForNoteBounds(chosenRegionPartial, start, duration, actionId);
			return chosenRegionPartial as ObjectStateNode<MidiRegion>;
		}
		const snappedLeft = this.viewportService.snapFloor(start+0.001);
		return RegionService.instance.addMidiRegion(this.track()!, {
			start: snappedLeft,
			duration: duration + (start - snappedLeft),
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
	moveNote(note: ObjectStateNode<MidiNote>, newStart: number, newMidiNote: number, actionId = uuid()) {
		const absStart = newStart + note.gp().start();
		const region = this.getOrMakeRegionForNote(absStart, note.duration(), actionId);
		note.start.set(absStart-region.start(), actionId);
		note.midiNote.set(newMidiNote, actionId);
	}
	moveNotes(notes: ObjectStateNode<MidiNote>[], startOffset: number, midiNoteOffset: number, actionId = uuid()) {
		notes.forEach(note => {
			this.moveNote(note, note.start() + startOffset, note.midiNote() + midiNoteOffset, actionId);
		});
	}
	resizeNote(note: ObjectStateNode<MidiNote>, newStart: number, newDuration: number, actionId = uuid()) {		
		const region = note.gp() as ObjectStateNode<MidiRegion>;
		note.start.set(newStart, actionId);
		note.duration.set(newDuration, actionId);
		this.updateRegionBoundsForNoteBounds(region, newStart+region.start(), newDuration, actionId);
	}
	duplicateNote(note: ObjectStateNode<MidiNote>) {
		const duped = { ...note.snapshot() };
		note._parent.insertValue(duped);
	}
	getRegionOfPx(px: number) {
		for (const el of RegionSelectService.instance.selectedTrack()?.regions.getAll() ?? []) {
			const pos = this.viewportService.pxToPos(px);
			const regionNode = el as ObjectStateNode<MidiRegion>;
			if (regionNode.start() <= pos && pos <= regionNode.start()+regionNode.duration()) {
				return regionNode;
			}
		}
		return null;
	}
}