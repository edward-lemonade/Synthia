import { ChangeDetectionStrategy, Component, computed, ElementRef, EventEmitter, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region, Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';

type ResizeHandle = 'left' | 'right' | null;

@Component({
	selector: 'viewport-track-region',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #region class="region"
			[style.--colorBase]="color()"
			
			[style.border-color]="isSelected() ? 'white' : 'black'"
			[style.opacity]="(viewportService.isResizingRegion() && isSelected()) ? '0.5' : '1'"

			[style.width]="width()"
			[style.left]="startPos()"
			(click)="onClick($event)"

			[style.cursor]="cursor()"
			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)"
			>
			<!-- Resize handles for selected regions -->
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-left"
				(mousedown)="onResizeHandleMouseDown($event, 'left')"></div>
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-right"
				(mousedown)="onResizeHandleMouseDown($event, 'right')"></div>
		</div>
		
		<!-- Resize ghost -->
		<div class="region region-ghost"
			*ngIf="viewportService.isResizingRegion() && ghostRegion()"
			[style.--colorBase]="color()"
			[style.border-color]="'white'"
			[style.width]="ghostWidth()"
			[style.left]="ghostStartPos()"
			>
		</div>
	`,
	styleUrl: './region.component.scss'
})

export class RegionComponent {
	@Input() track!: Track;
	@Input() trackIndex!: number;
	@Input() region!: Region;
	@Input() regionIndex!: number;
	@ViewChild("region", {static: true}) regionRef!: ElementRef<HTMLDivElement>;

	constructor (
		public projectState : ProjectState,
		public selectionService : RegionSelectService,
		public dragService : RegionDragService,
		public viewportService: ViewportService,
	) {}

	width = computed(() => `${this.region.duration * this.viewportService.measureWidth()}px`);
	startPos = computed(() => `${this.region.start * this.viewportService.measureWidth()}px`);

	color = computed(() => this.track.color);
	colorRegionBg = computed(() => {
		const hex = this.color();
		const hsl = hexToHsl(hex);

		return hslToCss(
			hsl.h, 
			Math.max(0, hsl.s - 20), 
			Math.max(0, hsl.l - 20));
	});
	colorRegionBgSelected = computed(() => {
		const hex = this.color();
		const hsl = hexToHsl(hex);

		return hslToCss(
			hsl.h, 
			Math.max(0, hsl.s - 20), 
			Math.max(0, hsl.l));
	});

	isSelected = computed(() => {
		const selected = this.selectionService.isRegionSelected(this.trackIndex, this.regionIndex);
		return selected;
	});

	cursor = computed(() => {
		if (this.viewportService.isResizingRegion()) {
			return 'ew-resize';
		}
		
		const handle = this.resizeHandle();
		if (handle) {
			return 'ew-resize';
		}
		
		return 'default';
	});

	onClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!this.dragService.isDragging()) {
			if (event.ctrlKey || event.metaKey) {
				this.selectionService.toggleSelectedRegion(this.trackIndex, this.regionIndex);
			} else {
				this.selectionService.setSelectedRegion(this.trackIndex, this.regionIndex);
			}
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.canResize() || this.viewportService.isResizingRegion() || this.dragService.isDragging()) {
			return;
		}

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const regionWidth = rect.width;
		
		// Define edge zones (8px from each edge)
		const edgeZone = 8;
		
		if (mouseX <= edgeZone) {
			this.resizeHandle.set('left');
		} else if (mouseX >= regionWidth - edgeZone) {
			this.resizeHandle.set('right');
		} else {
			this.resizeHandle.set(null);
		}
	}

	onMouseDown(event: MouseEvent) {
		event.preventDefault();

		if (this.canResize() && this.resizeHandle()) {
			this.startResize(event, this.resizeHandle()!);
		} else if (this.selectionService.isRegionSelected(this.trackIndex, this.regionIndex)) {
			const target = event.currentTarget as HTMLElement;
			const rect = target.closest("viewport-track")!.getBoundingClientRect();
			const mousePosX = this.viewportService.mouseToPos(event.clientX - rect.left, false);

			this.dragService.prepareDrag(mousePosX, this.region);
		} else {
			event.stopPropagation();
		}
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// RESIZE SYSTEM
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	canResize = computed(() => { return this.selectionService.selectedRegionsCount() === 1 && this.isSelected(); });
	private resizeHandle = signal<ResizeHandle>(null);
	private resizeStartPx = signal(0);
	private originalRegion: Region | null = null;

	ghostRegion = signal<{ start: number; duration: number } | null>(null);
	ghostWidth = computed(() => {
		const ghost = this.ghostRegion();
		return ghost ? `${ghost.duration * this.viewportService.measureWidth()}px` : '0px';
	});
	ghostStartPos = computed(() => {
		const ghost = this.ghostRegion();
		return ghost ? `${ghost.start * this.viewportService.measureWidth()}px` : '0px';
	});

	onResizeHandleMouseDown(event: MouseEvent, handle: ResizeHandle) {
		event.preventDefault();
		event.stopPropagation();
		
		this.startResize(event, handle);
	}
	
	private startResize(event: MouseEvent, handle: ResizeHandle) {
		this.viewportService.isResizingRegion.set(true);
		this.resizeHandle.set(handle);
		
		this.resizeStartPx.set(event.clientX);
		
		// Store original region state
		this.originalRegion = { ...this.region };
		
		// Initialize ghost with current region
		this.ghostRegion.set({
			start: this.region.start,
			duration: this.region.duration
		});
		
		// Add global mouse listeners
		document.addEventListener('mousemove', this.onDocumentMouseMove);
		document.addEventListener('mouseup', this.onDocumentMouseUp);
	}

	private onDocumentMouseMove = (event: MouseEvent) => {
		if (!this.viewportService.isResizingRegion() || !this.originalRegion) {
			return;
		}

		const deltaPx = event.clientX - this.resizeStartPx() + 8;
		const deltaPos = deltaPx / this.viewportService.measureWidth();
		
		const handle = this.resizeHandle();
		let newStart = this.originalRegion.start;
		let newDuration = this.originalRegion.duration;
		
		if (handle === 'left') {
			const newEnd = this.originalRegion.start + this.originalRegion.duration;
			newStart = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(this.originalRegion.start + deltaPos)) :
				Math.max(0, this.originalRegion.start + deltaPos);
			newDuration = Math.max(0.1, newEnd - newStart);
		} else if (handle === 'right') {
			const newEnd = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(this.originalRegion.start + this.originalRegion.duration + deltaPos)) :
				Math.max(0, this.originalRegion.start + this.originalRegion.duration + deltaPos);
			newDuration = Math.max(0.1, newEnd - newStart);
		}
		
		this.ghostRegion.set({
			start: newStart,
			duration: newDuration
		});
	};

	private onDocumentMouseUp = (event: MouseEvent) => {
		// Commit the final size from ghost to actual region
		const ghost = this.ghostRegion();
		if (ghost) {
			this.updateRegionSize(ghost.start, ghost.duration);
		}
		
		// Clean up resize state
		this.viewportService.isResizingRegion.set(false);
		this.resizeHandle.set(null);
		this.originalRegion = null;
		this.ghostRegion.set(null);
		
		// Remove global mouse listeners
		document.removeEventListener('mousemove', this.onDocumentMouseMove);
		document.removeEventListener('mouseup', this.onDocumentMouseUp);
	};

	private updateRegionSize(newStart: number, newDuration: number) {
		this.projectState.tracksState.setRegion(this.trackIndex, this.regionIndex, {
			...this.region,
			start: newStart,
			duration: newDuration
		});
	}
}

// COLOR HELPERS

function hexToHsl(hex: string): { h: number; s: number; l: number } {
	hex = hex.replace('#', '');
	const bigint = parseInt(hex.substring(0, 6), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;

	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	let h = 0, s = 0;
	let l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
			case gNorm: h = (bNorm - rNorm) / d + 2; break;
			case bNorm: h = (rNorm - gNorm) / d + 4; break;
		}
		h /= 6;
  	}	

  	return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToCss(h: number, s: number, l: number): string {
  	return `hsl(${h}, ${s}%, ${l}%)`;
}