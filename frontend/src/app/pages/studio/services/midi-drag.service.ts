import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ViewportService } from './viewport.service';
import { RegionSelectService } from './region-select.service';
import { Region } from '@shared/types';
import { StateService } from '../state/state.service';
import { TracksService } from './tracks.service';
import { RegionService } from './region.service';
import { MidiService } from './midi.service';
import { MidiSelectService } from './midi-select.service';

export interface DragInfo { // in beat/measure units
	startPosX: number;
	currentPosX: number;
	deltaPosX: number;
	mouseOffsetPosX: number;
	mouseOffsetMinPosX: number;
	heldRegion: Region;
}

@Injectable()
export class MidiDragService {
	private static _instance: MidiDragService;
	static get instance(): MidiDragService { return MidiDragService._instance; }

	constructor(private viewportService: ViewportService) { 
		MidiDragService._instance = this; 
	}

	get midiService() { return MidiService.instance }
	get selectService() { return MidiSelectService.instance }

	// Drag state
	readonly isDragReady = signal<boolean>(false);
	readonly isDragging = signal<boolean>(false);
	readonly dragInfo = signal<DragInfo | null>(null);

	public prepareDrag(startPosX: number, region: Region) { // mouse down on region, but not moving yet
		this.isDragReady.set(true);
		this.dragInfo.set({
			startPosX: startPosX,
			currentPosX: startPosX,
			deltaPosX: 0,
			mouseOffsetPosX: startPosX - region.start,
			mouseOffsetMinPosX: startPosX - this.selectService.leftmostSelectedNote().time(),
			heldRegion: region,
		});
	}

	public startDrag() { // mouse down and start moving
		this.isDragReady.set(false);
		this.isDragging.set(true);
	}

	public updateDrag(mousePosX: number) { // mouse down and moving
		const dragInfo = this.dragInfo();

		if (dragInfo && this.isDragging()) {
			let finalPosX = mousePosX;	

			if (this.viewportService.snapToGrid()) { // snap finalPosX
				const mouseOffsetPosX = dragInfo.mouseOffsetPosX;
				finalPosX = this.viewportService.snap(mousePosX - mouseOffsetPosX) + mouseOffsetPosX;
			}
			finalPosX = Math.max(0, finalPosX - this.dragInfo()!.mouseOffsetMinPosX) + this.dragInfo()!.mouseOffsetMinPosX;
				
			const deltaX = finalPosX - dragInfo.startPosX;

			this.dragInfo.set({
				...dragInfo,
				currentPosX: mousePosX,
				deltaPosX: deltaX,
			});
		}
	}

	public completeDrag() { // mouse off
		const deltaPosX = this.getDragDelta();
		this.midiService.moveNotes(this.selectService.selectedNotes(), deltaPosX);

		this.isDragReady.set(false);
		this.isDragging.set(false);
		this.dragInfo.set(null);
	}

	public cancelDrag() {
		this.isDragReady.set(false);
		this.isDragging.set(false);
		this.dragInfo.set(null);
	}

	public getDragDelta(): number {
		const info = this.dragInfo();
		return info ? info.deltaPosX : 0;
	}

	public getDragInfo(): DragInfo | null {
		return this.dragInfo();
	}

	public getSelectedRegions() {
		return this.selectService.selectedNotes();
	}
}