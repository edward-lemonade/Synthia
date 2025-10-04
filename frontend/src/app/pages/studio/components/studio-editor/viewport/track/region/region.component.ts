import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioRegion, MidiRegion, Region, RegionType, Track } from '@shared/types';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { DragGhostComponent } from './ghosts/drag-ghost.component';
import { ResizeGhostComponent } from "./ghosts/resize-ghost.component";
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { ObjectStateNode, StateNode } from '@src/app/pages/studio/state/state.factory';

import { AudioCacheService } from '@src/app/pages/studio/services/audio-cache.service';
import { RegionService } from '@src/app/pages/studio/services/region.service';
import { CabnetService } from '@src/app/pages/studio/services/cabnet.service';
import { hexToHsl, hslToCss } from '@src/app/utils/color';
import { createMidiViewport } from '@src/app/utils/render-midi';
import { createWaveformViewport } from '@src/app/utils/render-waveform';
import { MatDivider } from "@angular/material/divider";

type ResizeHandle = 'left' | 'right' | null;

interface ViewportBounds {
	startTime: number;
	endTime: number;
	startPx: number;
	endPx: number;
}

@Component({
	selector: 'viewport-track-region',
	imports: [CommonModule, MatMenuModule, MatIconModule, DragGhostComponent, ResizeGhostComponent, MatDivider],
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
			<div #canvasDiv class="canvas-div">
				<canvas #canvas class="canvas"></canvas>
			</div>

			<!-- Resize handles for selected regions -->
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-left"
				(mousedown)="onResizeHandleMouseDown($event, 'left')"></div>
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-right"
				(mousedown)="onResizeHandleMouseDown($event, 'right')"></div>
		</div>
		
		<!-- Resize ghost -->	
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
				<!-- MIDI specific -->
				<button class="region-menu-btn" mat-menu-item (click)="openMidiEditor()" *ngIf="isMidi()">
					<mat-icon>piano</mat-icon>
					<p>Open MIDI editor</p>
				</button>

				<!-- Audio specific -->

				<button class="region-menu-btn" mat-menu-item [matMenuTriggerFor]="audioFadeMenu" *ngIf="false">
					<mat-icon>piano</mat-icon>
					<p>Fade</p>
				</button>
				<button class="region-menu-btn" mat-menu-item [matMenuTriggerFor]="audioPitchMenu" *ngIf="false">
					<mat-icon>piano</mat-icon>
					<p>Pitch</p>
				</button>
				<button class="region-menu-btn" mat-menu-item *ngIf="false">
					<mat-icon>piano</mat-icon>
					<p>Tempo</p>
				</button>
				<button class="region-menu-btn" mat-menu-item *ngIf="false">
					<mat-icon>piano</mat-icon>
					<p>Stretch</p>
				</button>
				
				<mat-divider *ngIf="isMidi()"/>
				
				<!-- General -->
				<button class="region-menu-btn" mat-menu-item (click)="duplicateRegion()">
					<mat-icon>content_copy</mat-icon>
					<p>Duplicate region</p>
				</button>
				<button class="region-menu-btn" mat-menu-item (click)="deleteRegion()">
					<mat-icon>delete</mat-icon>
					<p>Delete region</p>
				</button>
			</div>
		</mat-menu>

		<!-- Audio Menus -->
		<mat-menu #audioFadeMenu="matMenu" [class]="'region-menu'">
			<div class="region-menu-content">
				<button class="region-menu-btn" mat-menu-item (click)="audioFadeIn()">
					<mat-icon>north_east</mat-icon>
					<p>Fade in</p>
				</button>
				<button class="region-menu-btn" mat-menu-item (click)="audioFadeOut()">
					<mat-icon>south_east</mat-icon>
					<p>Fade out</p>
				</button>
			</div>
		</mat-menu>
		<mat-menu #audioPitchMenu="matMenu" [class]="'region-menu'">
			<div class="region-menu-content">				
				<button *ngFor="let num of pitchOptions;"
				class="region-menu-btn" mat-menu-item (click)="audioPitch(num)">
					<p>{{num}}</p>
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './region.component.scss'
})

export class RegionComponent implements OnInit, AfterViewInit, OnDestroy {
	@Input() track!: ObjectStateNode<Track>;
	@Input() region!: ObjectStateNode<AudioRegion | MidiRegion>;
	@Input() trackIndex!: number;
	@Input() regionIndex!: number;
	@ViewChild("region", {static: true}) regionRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvasDiv", {static: true}) canvasDiv!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

	declare type: RegionType;
	declare fileId: string;

	currentAudioFile: any = null;
	private animationFrameId?: number;
	private lastViewportBounds?: ViewportBounds;
	private lastZoomLevel?: number;
	private resizeObserver?: ResizeObserver;

	constructor (
		public stateService: StateService,
		public tracksService: TracksService,
		public selectionService: RegionSelectService,
		public dragService: RegionDragService,
		public viewportService: ViewportService,
		public audioCacheService: AudioCacheService,
		public regionService: RegionService,
		public cabnetService: CabnetService,
	) {
		effect(() => {
			const scrollX = this.viewportService.measurePosX();
			const measureWidth = this.viewportService.measureWidth();
			const totalWidth = this.viewportService.totalWidth();
			const regionDuration = this.region.duration();
			const regionStart = this.region.start();
				
			if (this.type === RegionType.Audio) {
				this.scheduleWaveformRender();
			} else if (this.type === RegionType.Midi) {
				const notes = (this.region as ObjectStateNode<MidiRegion>).midiData();
				notes.forEach(note => {
					const duration = note.duration();
					const velocity = note.velocity();
					const start = note.start();
					const midiNote = note.midiNote();
				})
				this.scheduleMidiRender();
			}
			
		});
	}

	ngOnInit(): void {
		this.fileId = this.region.fileId();
	}

	ngAfterViewInit(): void {
		this.type = this.region.type();
		
		if (this.region.type() === RegionType.Audio) {
			this.setupCanvasObserver();
			this.scheduleWaveformRender();
		} else if (this.region.type() === RegionType.Midi) {
			this.setupCanvasObserver();
			this.scheduleWaveformRender();
		}
	}

	ngOnDestroy(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	private setupCanvasObserver(): void {
		this.resizeObserver = new ResizeObserver(() => {
			if (this.type === RegionType.Audio) {
				this.scheduleWaveformRender();
			} else if (this.type === RegionType.Midi) {
				this.scheduleMidiRender();
			}
		});

		if (this.canvas?.nativeElement) {
			this.resizeObserver.observe(this.canvas.nativeElement);
		}
	}

	private getViewportBounds(): ViewportBounds {
		const startPx = this.viewportService.posToPx(this.viewportService.measurePosX());
		const endPx = startPx + this.viewportService.viewportWidth();
		
		const startTime = this.viewportService.posToTime(this.viewportService.pxToPos(startPx));
		const endTime = this.viewportService.posToTime(this.viewportService.pxToPos(endPx));
		
		return {
			startTime,
			endTime,
			startPx,
			endPx
		};
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
		const selected = this.selectionService.isRegionSelected(this.region);
		return selected;
	});

	// ====================================================================================================
	// Midi

	private scheduleMidiRender(): void {
		// Cancel any pending render
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}

		this.animationFrameId = requestAnimationFrame(() => {
			this.renderMidiPreview();
			this.animationFrameId = undefined;
		});
	}

	private renderMidiPreview(): void {
		if (!this.canvas?.nativeElement || this.type !== RegionType.Midi) {
			return;
		}

		const viewportBounds = this.getViewportBounds();
		const canvas = this.canvas.nativeElement;

		const regionStartTime = this.viewportService.posToTime(this.region.start());
		const regionDurationTime = this.viewportService.posToTime(this.region.duration());
		
		const relativeVisibleStartTime = Math.max(viewportBounds.startTime, regionStartTime) - regionStartTime;
		const relativeVisibleEndTime = Math.min(viewportBounds.endTime, regionStartTime + regionDurationTime) - regionStartTime;
		const startPx = this.viewportService.timeToPx(relativeVisibleStartTime);
		const endPx = this.viewportService.timeToPx(relativeVisibleEndTime);

		if (startPx >= endPx) {
			const ctx = canvas.getContext('2d');
			if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
			return;
		}
		this.canvasDiv.nativeElement.style.left = startPx+'px';
		this.canvasDiv.nativeElement.style.width = (endPx-startPx)+'px'
		
		const midiRegion = this.region as StateNode<MidiRegion>;
		const notes = midiRegion.midiData.snapshot();

		const result = createMidiViewport(
			canvas,
			notes,
			startPx,
			endPx,
			(pos: number) => ViewportService.instance.posToPx(pos),
		);

		this.lastViewportBounds = viewportBounds;
		this.lastZoomLevel = this.viewportService.measureWidth();
	}

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

	private scheduleWaveformRender(): void {
		// Cancel any pending render
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}

		// Schedule new render
		this.animationFrameId = requestAnimationFrame(() => {
			this.renderWaveformPreview();
			this.animationFrameId = undefined;
		});
	}

	async renderWaveformPreview() {
		if (!this.canvas?.nativeElement || this.type !== RegionType.Audio) {
			return;
		}

		try {
			await this.waitForAudioToLoad();

			const viewportBounds = this.getViewportBounds();
			const canvas = this.canvas.nativeElement;

			const regionStartTime = this.viewportService.posToTime(this.region.start());
			const regionDurationTime = this.viewportService.posToTime(this.region.duration());
			
			const relativeVisibleStartTime = Math.max(viewportBounds.startTime, regionStartTime) - regionStartTime;
			const relativeVisibleEndTime = Math.min(viewportBounds.endTime, regionStartTime + regionDurationTime) - regionStartTime;
			const startPx = this.viewportService.timeToPx(relativeVisibleStartTime);
			const endPx = this.viewportService.timeToPx(relativeVisibleEndTime);

			if (startPx >= endPx) {
				const ctx = canvas.getContext('2d');
				if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
				return;
			}
			this.canvasDiv.nativeElement.style.left = startPx+'px';
			this.canvasDiv.nativeElement.style.width = (endPx-startPx)+'px'
			
			const audioRegion = this.region as StateNode<AudioRegion>;
			const audioStartTime = audioRegion.audioStartOffset() + relativeVisibleStartTime;
			const audioEndTime = audioRegion.audioStartOffset() + relativeVisibleEndTime;

			// Render only the visible portion - now passing region bounds
			const result = await createWaveformViewport(
				this.audioCacheService.getWaveformData(this.fileId)!,
				canvas,
				audioStartTime,
				audioEndTime,
				startPx,
				endPx,
			);

			// Update tracking variables
			this.lastViewportBounds = viewportBounds;
			this.lastZoomLevel = this.viewportService.measureWidth();
			
			//console.log(`Rendered waveform viewport: ${relativeVisibleStartTime.toFixed(2)}s - ${relativeVisibleEndTime.toFixed(2)}s`);
			
		} catch (error) {
			console.error('Failed to render waveform viewport:', error);
		}
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
		const ghost = this.ghostRegion();
		if (ghost) {
			this.regionService.resizeRegion(this.region, ghost.start, ghost.duration);
		}
		
		// Clean up resize state
		this.viewportService.isResizingRegion.set(false);
		this.resizeHandle.set(null);
		this.originalRegion = null;
		this.ghostRegion.set(null);
		
		// Remove global mouse listeners
		document.removeEventListener('mousemove', this.onResizeMove);
		document.removeEventListener('mouseup', this.onResizeFinish);

		this.scheduleWaveformRender();	// rerender waveform
	};

	// ====================================================================================================
	// Events

	onClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!this.dragService.isDragging()) {
			if (event.ctrlKey || event.metaKey) {
				this.selectionService.toggleSelectedRegion(this.region);
			} else {
				this.selectionService.setSelectedRegion(this.region);
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
		} else if (this.selectionService.isRegionSelected(this.region)) {
			const mousePxX = this.viewportService.mouseXToPx(event.clientX, false);
			const mousePosX = this.viewportService.pxToPos(mousePxX, false);

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

	// [MIDI]

	openMidiEditor() {
		if (this.isMidi()) {
			this.selectionService.setSelectedRegion(this.region);
			this.selectionService.setSelectedTrack(this.track);

			this.cabnetService.openCabnet();
		}
	}

	// [Audio]

	audioFadeIn() {}
	audioFadeOut() {}

	public pitchOptions = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
	audioPitch(num: Number) {

	}

	// [General]

	duplicateRegion() { this.regionService.duplicateRegion(this.region); }
	deleteRegion() { this.regionService.deleteRegion(this.region); }
}
