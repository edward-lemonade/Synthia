import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ProjectState } from './project-state.service';
import { ProjectStateTracks } from './substates';
import { ViewportService } from './viewport.service';
import { RegionSelectService } from './region-select.service';
import { Region } from '@shared/types';

export interface DragInfo { // in beat/measure units
	startPosX: number;
	currentPosX: number;
	deltaPosX: number;
	mouseOffsetPosX: number;
	heldRegion: Region;
}

@Injectable()
export class RegionDragService {
	declare tracksState: ProjectStateTracks;

	// Drag state
	readonly isDragReady = signal<boolean>(false);
	readonly isDragging = signal<boolean>(false);
	readonly dragInfo = signal<DragInfo | null>(null);

	constructor(
		private injector: Injector,
		private projectState: ProjectState,
		private viewportService: ViewportService,
		private selectService: RegionSelectService,
	) {
		this.tracksState = projectState.tracksState;
	}

	public prepareDrag(startPosX: number, region: Region) { // mouse down on region, but not moving yet
		this.isDragReady.set(true);
		this.dragInfo.set({
			startPosX: startPosX,
			currentPosX: startPosX,
			deltaPosX: 0,
			mouseOffsetPosX: startPosX - region.start,
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
		this.tracksState.moveRegions(this.selectService.selectedRegions(), deltaPosX);

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
}