import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ViewportService } from '../viewport.service';
import { MidiNote } from '@shared/types';
import { MidiEditorService } from './midi-editor.service';
import { MidiSelectService } from './midi-select.service';

export interface DragInfo { // in beat/measure units for X, pitch units for Y
	startPosX: number;
	startPitch: number;
	currentPosX: number;
	currentPitch: number;
	deltaPosX: number;
	deltaPitch: number;
	mouseOffsetPosX: number;
	mouseOffsetMinPosX: number;
	minPitchOffset: number;
	maxPitchOffset: number;
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

	public prepareDrag(startPosX: number, startPitch: number, note: MidiNote) { // mouse down on note, but not moving yet
		const selectedNotes = this.selectService.selectedNotes();
		const lowestPitch = selectedNotes.reduce((min, n) => Math.min(min, n.pitch()), note.pitch);
		const highestPitch = selectedNotes.reduce((min, n) => Math.max(min, n.pitch()), note.pitch);
		
		this.isDragReady.set(true);
		this.dragInfo.set({
			startPosX: startPosX,
			startPitch: startPitch,
			currentPosX: startPosX,
			currentPitch: startPitch,
			deltaPosX: 0,
			deltaPitch: 0,
			mouseOffsetPosX: startPosX - note.start,
			mouseOffsetMinPosX: startPosX - this.selectService.leftmostSelectedNote().start(),
			minPitchOffset: note.pitch - lowestPitch,
			maxPitchOffset: highestPitch - note.pitch,
			heldNote: note,
		});
	}

	public startDrag() { // mouse down and start moving
		this.isDragReady.set(false);
		this.isDragging.set(true);
	}

	public updateDrag(mousePosX: number, pitch: number) { // mouse down and moving
		const dragInfo = this.dragInfo();

		if (dragInfo && this.isDragging()) {
			let finalPosX = mousePosX;
			let finalPitch = pitch;

			if (this.viewportService.snapToGrid()) {
				const mouseOffsetPosX = dragInfo.mouseOffsetPosX;
				finalPosX = this.viewportService.snap(mousePosX - mouseOffsetPosX) + mouseOffsetPosX;
			}

			finalPosX = Math.max(0, finalPosX - dragInfo.mouseOffsetMinPosX) + dragInfo.mouseOffsetMinPosX;

			const adjustedMinY = this.midiService.MIN_PITCH + dragInfo.minPitchOffset;
			const adjustedMaxY = this.midiService.MAX_PITCH - dragInfo.maxPitchOffset;
			finalPitch = Math.max(adjustedMinY, Math.min(adjustedMaxY, finalPitch));

			const deltaX = finalPosX - dragInfo.startPosX;
			const deltaY = finalPitch - dragInfo.startPitch;

			this.dragInfo.set({
				...dragInfo,
				currentPosX: mousePosX,
				currentPitch: pitch,
				deltaPosX: deltaX,
				deltaPitch: deltaY,
			});
		}
	}

	public completeDrag() { // mouse up
		const dragInfo = this.dragInfo();
		if (dragInfo) {
			const deltaPosX = dragInfo.deltaPosX;
			const deltaPosY = dragInfo.deltaPitch;

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
		return info ? { x: info.deltaPosX, y: info.deltaPitch } : { x: 0, y: 0 };
	}

	public getDragDeltaX(): number {
		const info = this.dragInfo();
		return info ? info.deltaPosX : 0;
	}

	public getDragDeltaY(): number {
		const info = this.dragInfo();
		return info ? info.deltaPitch : 0;
	}

	public getDragInfo(): DragInfo | null {
		return this.dragInfo();
	}

	public getSelectedNotes() {
		return this.selectService.selectedNotes();
	}
}