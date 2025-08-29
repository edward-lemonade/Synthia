import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ViewportService } from './viewport.service';
import { SelectService } from './select.service';
import { Region } from '@shared/types';
import { StateService } from '../state/state.service';
import { TracksService } from './tracks.service';
import { RegionService } from './region.service';

export interface DragInfo { // in beat/measure units
	startPosX: number;
	currentPosX: number;
	deltaPosX: number;
	mouseOffsetPosX: number;
	mouseOffsetMinPosX: number;
	heldRegion: Region;
}

@Injectable()
export class RegionDragService {
	private static _instance: RegionDragService;
	static get instance(): RegionDragService { return RegionDragService._instance; }

	constructor() { RegionDragService._instance = this; }

	get tracksService() { return TracksService.instance }
	get regionService() { return RegionService.instance }
	get selectService() { return SelectService.instance }
	get viewportService() { return ViewportService.instance }

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
			mouseOffsetMinPosX: startPosX - this.selectService.leftmostSelectedRegion().start(),
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
		this.regionService.moveRegions(this.selectService.selectedRegions(), deltaPosX);

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
		return this.selectService.selectedRegions();
	}
}