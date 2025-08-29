import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioRegion, MidiRegion, Region, RegionType, Track } from '@shared/types';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { SelectService } from '@src/app/pages/studio/services/select.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { DragGhostComponent } from './ghosts/drag-ghost.component';
import { ResizeGhostComponent } from "./ghosts/resize-ghost.component";
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { StateNode } from '@src/app/pages/studio/state/state.factory';

import { AudioCacheService } from '@src/app/pages/studio/services/audio-cache.service';
import { WaveformRenderService } from '@src/app/pages/studio/services/waveform-render.service';
import { RegionPath, RegionService } from '@src/app/pages/studio/services/region.service';
type ResizeHandle = 'left' | 'right' | null;

@Component({
	selector: 'viewport-track-region',
	imports: [CommonModule, MatMenuModule, MatIconModule, DragGhostComponent, ResizeGhostComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #regionEl class="region"
			[style.--colorBase]="color()"
			
			[style.border-color]="isSelected() ? 'white' : 'black'"
			[style.opacity]="(viewportService.isResizingRegion() && isSelected()) ? '0.5' : '1'"

			[style.width]="width()"
			[style.left]="startPos()"
			(click)="onClick($event)"
			(contextmenu)="onContextMenu($event)"
			[matContextMenuTriggerFor]="regionMenu"

			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)"
		>
			<div class="waveform-div">
				<canvas #waveformCanvas class="waveform-canvas"></canvas>
			</div>

			<!-- Resize handles for selected regions -->
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-left"
				(mousedown)="onResizeHandleMouseDown($event, 'left')"></div>
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-right"
				(mousedown)="onResizeHandleMouseDown($event, 'right')"></div>
		</div>
		

		<resize-ghost
			*ngIf="viewportService.isResizingRegion() && ghostRegion()"
			[track]="track"
			[ghost]="ghostRegion()"
			/>

		<!-- Drag ghost -->	
		<drag-ghost
			*ngIf="dragService.isDragging() && isSelected()"
			[track]="track"
			[region]="region"/>

		<!-- Context Menu -->
		<mat-menu #regionMenu="matMenu" [class]="'region-menu'">
			<div class="region-menu-content">
				<button class="region-menu-btn" mat-menu-item (click)="openMidiEditor()" *ngIf="isMidi()">
					<mat-icon>piano</mat-icon>
					Open MIDI Editor
				</button>
				<button class="region-menu-btn" mat-menu-item (click)="duplicateRegion()">
					<mat-icon>content_copy</mat-icon>
					Duplicate Region
				</button>
				<button class="region-menu-btn" mat-menu-item (click)="deleteRegion()">
					<mat-icon>delete</mat-icon>
					Delete Region
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './region.component.scss'
})

export class RegionComponent implements OnInit, AfterViewInit {
	@Input() track!: StateNode<Track>;
	@Input() region!: StateNode<AudioRegion | MidiRegion>;
	@Input() trackIndex!: number;
	@Input() regionIndex!: number;
	@ViewChild("region", {static: true}) regionRef!: ElementRef<HTMLDivElement>;
	@ViewChild('waveformCanvas', { static: true }) waveformCanvas!: ElementRef<HTMLCanvasElement>;

	declare type: RegionType;
	declare fileId: string;
	declare regionPath: RegionPath;

	currentAudioFile: any = null;

	constructor (
		public stateService: StateService,
		public tracksService: TracksService,
		public selectionService: SelectService,
		public dragService: RegionDragService,
		public viewportService: ViewportService,
		public audioCacheService: AudioCacheService,
		public waveformRenderService: WaveformRenderService,
		public regionService: RegionService,
	) {}

	ngOnInit(): void {
		this.regionPath = {
			trackId: this.track._id,
			regionId: this.region._id
		};
		this.fileId = this.region.fileId();
	}

	ngAfterViewInit(): void {
		this.type = this.region.type();
		console.log(this.type);
		if (this.region.type() == RegionType.Audio) {
			this.renderWaveform();
		}
	}

	// ====================================================================================================
	// Fields

	get tracks() { return this.stateService.state.studio.tracks };

	isMidi = computed(() => this.region.type() == RegionType.Midi);
	width = computed(() => `${this.region.duration() * this.viewportService.measureWidth()}px`);
	startPos = computed(() => `${this.region.start() * this.viewportService.measureWidth()}px`);

	color = computed(() => this.track.color());
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
		const selected = this.selectionService.isRegionSelected(this.regionPath);
		return selected;
	});

	// ====================================================================================================
	// Waveform

	private async waitForAudioToLoad(): Promise<void> {
		if (this.audioCacheService.cache.get(this.fileId)) {
			return;
		}

		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(() => {
				if (this.audioCacheService.cache.get(this.fileId)) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100); // Check every 100ms

			// Timeout after 30 seconds
			setTimeout(() => {
				clearInterval(checkInterval);
				reject(new Error('Timeout waiting for audio to load'));
			}, 30000);
		});
	}

	async renderWaveform() {
		console.log("waitng")
		await this.waitForAudioToLoad()

		console.log(this.stateService.state.snapshot());
		const result = await this.waveformRenderService.renderSimple(
			this.fileId,
			this.waveformCanvas.nativeElement,
			(this.region as StateNode<AudioRegion>).audioStartOffset(),
			(this.region as StateNode<AudioRegion>).audioEndOffset(),
		);
		console.log(result);
	}

	// ====================================================================================================
	// Resize System

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
		this.originalRegion! = this.region.snapshot();
		
		// Initialize ghost with current region
		this.ghostRegion.set({
			start: this.region.start(),
			duration: this.region.duration()
		});
		
		// Add global mouse listeners
		document.addEventListener('mousemove', this.onResizeMove);
		document.addEventListener('mouseup', this.onResizeFinish);
	}

	private onResizeMove = (event: MouseEvent) => {
		if (!this.viewportService.isResizingRegion() || !this.originalRegion) {
			return;
		}

		const deltaPx = event.clientX - this.resizeStartPx() + 8;
		const deltaPos = deltaPx / this.viewportService.measureWidth();
		
		const handle = this.resizeHandle();
		let newStart = this.originalRegion.start;
		let newDuration = this.originalRegion.duration;
		let newEnd = this.originalRegion.start + this.originalRegion.duration;
		
		if (handle === 'left') {
			newStart = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(this.originalRegion.start + deltaPos)) :
				Math.max(0, this.originalRegion.start + deltaPos);
		} else if (handle === 'right') {
			newEnd = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(this.originalRegion.start + this.originalRegion.duration + deltaPos)) :
				Math.max(0, this.originalRegion.start + this.originalRegion.duration + deltaPos);
		}

		if (this.type == RegionType.Audio) { // Clamp if audio region
			const fullStart = (this.region as StateNode<AudioRegion>).fullStart();
			const fullDuration = (this.region as StateNode<AudioRegion>).fullDuration();
			const fullEnd = fullStart + fullDuration;
			newStart = Math.max(newStart, fullStart); 
			newEnd = Math.min(newEnd, fullEnd);
		}
		newDuration = Math.max(0.1, newEnd - newStart);

		this.ghostRegion.set({
			start: newStart,
			duration: newDuration
		});
	};

	private onResizeFinish = (event: MouseEvent) => {
		// Commit the final size from ghost to actual region
		const ghost = this.ghostRegion();
		if (ghost) {
			this.regionService.resizeRegion(this.regionPath, ghost.start, ghost.duration);
		}
		
		// Clean up resize state
		this.viewportService.isResizingRegion.set(false);
		this.resizeHandle.set(null);
		this.originalRegion = null;
		this.ghostRegion.set(null);
		
		// Remove global mouse listeners
		document.removeEventListener('mousemove', this.onResizeMove);
		document.removeEventListener('mouseup', this.onResizeFinish);

		this.renderWaveform(); // rerender waveform
	};

	// ====================================================================================================
	// Events

	onClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!this.dragService.isDragging()) {
			if (event.ctrlKey || event.metaKey) {
				this.selectionService.toggleSelectedRegion(this.regionPath);
			} else {
				this.selectionService.setSelectedRegion(this.regionPath.trackId, this.regionPath.regionId);
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
		} else if (this.selectionService.isRegionSelected(this.regionPath)) {
			const target = event.currentTarget as HTMLElement;
			const rect = target.closest("viewport-track")!.getBoundingClientRect();
			const mousePosX = this.viewportService.pxToPos(event.clientX - rect.left, false);

			this.dragService.prepareDrag(mousePosX, this.region.snapshot());
		} else {
			event.stopPropagation();
		}
	}

	onContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	// ====================================================================================================
	// Region Actions

	openMidiEditor() {
		if (this.isMidi()) {
			//this.midiService.openEditor(this.trackIndex, this.regionIndex);
		}
	}

	duplicateRegion() {
		const duplicatedRegion = { ...this.region };
		this.regionService.duplicateRegion(this.regionPath);
	}

	deleteRegion() {
		this.regionService.deleteRegion(this.regionPath);
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