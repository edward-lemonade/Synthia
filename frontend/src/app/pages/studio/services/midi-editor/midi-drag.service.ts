import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ViewportService } from '../viewport.service';
import { MidiNote } from '@shared/types';
import { MidiEditorService } from './midi-editor.service';
import { MidiSelectService } from './midi-select.service';

export interface DragInfo { // in beat/measure units for X, midiNote units for Y
	startPosX: number;
	startMidiNote: number;
	currentPosX: number;
	currentMidiNote: number;
	deltaPosX: number;
	deltaMidiNote: number;
	mouseOffsetPosX: number;
	mouseOffsetMinPosX: number;
	minMidiNoteOffset: number;
	maxMidiNoteOffset: number;
	heldNote: MidiNote;
}

@Injectable()
export class MidiDragService {
	private static _instance: MidiDragService;
	static get instance(): MidiDragService { return MidiDragService._instance; }

	constructor(private viewportService: ViewportService) { 
		MidiDragService._instance = this; 
	}

	get midiService() { return MidiEditorService.instance }
	get selectService() { return MidiSelectService.instance }

	// Drag state
	readonly isDragReady = signal<boolean>(false);
	readonly isDragging = signal<boolean>(false);
	readonly dragInfo = signal<DragInfo | null>(null);

	public prepareDrag(startPosX: number, startMidiNote: number, note: MidiNote) { // mouse down on note, but not moving yet
		const selectedNotes = this.selectService.selectedNotes();
		const lowestMidiNote = selectedNotes.reduce((min, n) => Math.min(min, n.midiNote()), note.midiNote);
		const highestMidiNote = selectedNotes.reduce((min, n) => Math.max(min, n.midiNote()), note.midiNote);
		
		this.isDragReady.set(true);
		this.dragInfo.set({
			startPosX: startPosX,
			startMidiNote: startMidiNote,
			currentPosX: startPosX,
			currentMidiNote: startMidiNote,
			deltaPosX: 0,
			deltaMidiNote: 0,
			mouseOffsetPosX: startPosX - note.start,
			mouseOffsetMinPosX: startPosX - this.selectService.leftmostSelectedNote().start(),
			minMidiNoteOffset: note.midiNote - lowestMidiNote,
			maxMidiNoteOffset: highestMidiNote - note.midiNote,
			heldNote: note,
		});
	}

	public startDrag() { // mouse down and start moving
		this.isDragReady.set(false);
		this.isDragging.set(true);
	}

	public updateDrag(mousePosX: number, midiNote: number) { // mouse down and moving
		const dragInfo = this.dragInfo();

		if (dragInfo && this.isDragging()) {
			let finalPosX = mousePosX;
			let finalMidiNote = midiNote;

			if (this.viewportService.snapToGrid()) {
				const mouseOffsetPosX = dragInfo.mouseOffsetPosX;
				finalPosX = this.viewportService.snap(mousePosX - mouseOffsetPosX) + mouseOffsetPosX;
			}

			finalPosX = Math.max(0, finalPosX - dragInfo.mouseOffsetMinPosX) + dragInfo.mouseOffsetMinPosX;

			const adjustedMinY = this.midiService.MIN_MIDINOTE + dragInfo.minMidiNoteOffset;
			const adjustedMaxY = this.midiService.MAX_MIDINOTE - dragInfo.maxMidiNoteOffset;
			finalMidiNote = Math.max(adjustedMinY, Math.min(adjustedMaxY, finalMidiNote));

			const deltaX = finalPosX - dragInfo.startPosX;
			const deltaY = finalMidiNote - dragInfo.startMidiNote;

			this.dragInfo.set({
				...dragInfo,
				currentPosX: mousePosX,
				currentMidiNote: midiNote,
				deltaPosX: deltaX,
				deltaMidiNote: deltaY,
			});
		}
	}

	public completeDrag() { // mouse up
		const dragInfo = this.dragInfo();
		if (dragInfo) {
			const deltaPosX = dragInfo.deltaPosX;
			const deltaPosY = dragInfo.deltaMidiNote;

			this.midiService.moveNotes(this.selectService.selectedNotes(), deltaPosX, deltaPosY);
		}

		this.isDragReady.set(false);
		this.isDragging.set(false);
		this.dragInfo.set(null);
	}

	public cancelDrag() {
		this.isDragReady.set(false);
		this.isDragging.set(false);
		this.dragInfo.set(null);
	}

	public getDragDelta(): { x: number; y: number } {
		const info = this.dragInfo();
		return info ? { x: info.deltaPosX, y: info.deltaMidiNote } : { x: 0, y: 0 };
	}

	public getDragDeltaX(): number {
		const info = this.dragInfo();
		return info ? info.deltaPosX : 0;
	}

	public getDragDeltaY(): number {
		const info = this.dragInfo();
		return info ? info.deltaMidiNote : 0;
	}

	public getDragInfo(): DragInfo | null {
		return this.dragInfo();
	}

	public getSelectedNotes() {
		return this.selectService.selectedNotes();
	}
}