import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, Injector, Input, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { MidiNote, MidiRegion } from '@shared/types';
import { CabnetService } from '@src/app/pages/studio/services/cabnet.service';
import { MidiService } from '@src/app/pages/studio/services/midi.service';
import { PlaybackService } from '@src/app/pages/studio/services/playback.service';
import { RegionService } from '@src/app/pages/studio/services/region.service';
import { BoxSelectBounds } from '@src/app/pages/studio/services/region-select.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { ObjectStateNode } from '@src/app/pages/studio/state/state.factory';
import { getRegionGhostColor } from '@src/app/utils/color';
import { MidiSelectService } from '@src/app/pages/studio/services/midi-select.service';
import { MidiDragService } from '@src/app/pages/studio/services/midi-drag.service';

@Component({
	selector: 'midi-editor-viewport',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #container class="container"
			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)"
			(mouseup)="onMouseUp($event)">

			<canvas 
				#canvas 
				class="canvas"
				></canvas>

			<div #scrollContainer class="scroll-container" 
				(scroll)="onScroll()"
				>
				<div 
					*ngFor="let scale of [].constructor(SCALES); let scaleIndex = index"
					class="scale">
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row black-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row black-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row black-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>

					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row black-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row black-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
					<div class="row white-row" [style.height.px]="ROW_HEIGHT" [style.width.px]="totalWidth"></div>
				</div>

				<div class="region"
					*ngFor="let regionNode of regions; let regionIndex = index"
					[style.background-color]="ghostColor"
					[style.border-color]="ghostColor"
					[style.left.px]="viewportService.posToPx(regionNode.start())"
					[style.width.px]="viewportService.posToPx(regionNode.duration())"
					[style.height.px]="SCALE_HEIGHT * SCALES"
					> 

				</div>

				<!-- Box selection overlay -->
				<div 
					*ngIf="selectService.isBoxSelecting()"
					class="box-selection-overlay"
					[style.left.px]="boxOverlayStyle().left"
					[style.top.px]="boxOverlayStyle().top"
					[style.width.px]="boxOverlayStyle().width"
					[style.height.px]="boxOverlayStyle().height">
				</div>
			</div>
		</div>
	`,
	styleUrl: './viewport.component.scss'
})

export class ViewportComponent implements AfterViewInit, OnInit {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;

	@Input() SCALES: number = 0;
	@Input() SCALE_HEIGHT: number = 0;
	declare ROW_HEIGHT: number;

	public DPR = window.devicePixelRatio || 1;

	private isMouseDown = false;
	private dragThreshold = 5; // pixels to start drag

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public playbackService: PlaybackService,
		public midiService: MidiService,
		public selectService: MidiSelectService,
		public dragService: MidiDragService,
		public tracksService: TracksService,
		public regionService: RegionService,
		public cabnetService: CabnetService,
	) {}

	get totalWidth() { return ViewportService.instance.totalWidth() }
	get notes() { return CabnetService.instance.currentTrackNode()?.regions().flatMap((region) => {return {...(region as ObjectStateNode<MidiRegion>).midiData()}})}

	ngOnInit(): void {
		this.ROW_HEIGHT = this.SCALE_HEIGHT / 12;
	}
	
	ngAfterViewInit(): void {
		const canvas = this.canvasRef.nativeElement;
		const ctx = canvas.getContext("2d")!;

		this.viewportService.registerVP(
			this.scrollContainerRef.nativeElement, canvas, ctx,
			this.scrollContainerRef.nativeElement.clientWidth, 
			this.scrollContainerRef.nativeElement.clientHeight, 
		);

		runInInjectionContext(this.injector, () => {
			effect(() => {
				const posX = this.viewportService.windowPosX();
				const posY = this.viewportService.windowPosY();

				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollLeft !== posX) {
					this.isProgrammaticScroll = true;
					this.scrollContainerRef.nativeElement.scrollLeft = posX;
				}
				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollTop !== posY) {
					this.isProgrammaticScroll = true;
					this.scrollContainerRef.nativeElement.scrollTop = posY;
				}
			});
		});
	}

	private isProgrammaticScroll = false;
	onScroll(): void {
		if (!this.scrollContainerRef.nativeElement) return;
		
		if (this.isProgrammaticScroll) {
			this.isProgrammaticScroll = false; // reset flag
			return; 
		}

		const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
		const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;

		this.viewportService.windowPosX.set(scrollLeft);
		this.viewportService.windowPosY.set(scrollTop);
	}

	// ==========================================================================================
	// Region / Note Render

	get track() { return this.cabnetService.currentTrackNode() }
	get regions() { return this.track?.regions() }

	get ghostColor() { return getRegionGhostColor(this.track!.color()) }

	// ==========================================================================================
	// Mouse Events

	onMouseDown(event: MouseEvent) {}
	onMouseUp(event: MouseEvent) {}
	onMouseMove(event: MouseEvent) {}

	// ==========================================================================================
	// Box Selection

	private getNotesInBounds(bounds: BoxSelectBounds): ObjectStateNode<MidiNote>[] {
		const selectedNotes: ObjectStateNode<MidiNote>[] = [];
		const notes = this.notes!;
		
		const normalizedBounds = {
			left: Math.min(bounds.startX, bounds.endX),
			right: Math.max(bounds.startX, bounds.endX),
			top: Math.min(bounds.startY, bounds.endY),
			bottom: Math.max(bounds.startY, bounds.endY)
		};

		notes.forEach((note, noteIndex) => {
			const noteTop = this.getNoteTop(note);
			const noteBottom = this.getNoteBottom(note);
			const noteLeft = this.getNoteLeft(note);
			const noteRight = this.getNoteRight(note);

			if (this.boundsIntersect(
				normalizedBounds.left, normalizedBounds.right,
				noteLeft, noteRight
			) && this.boundsIntersect(
				normalizedBounds.top, normalizedBounds.bottom,
				noteTop, noteBottom
			)) {
				selectedNotes.push(note);		
			}
		});

		return selectedNotes;
	}

	private boundsIntersect(start1: number, end1: number, start2: number, end2: number): boolean {
		return start1 <= end2 && end1 >= start2;
	}

	private getNoteLeft(note: ObjectStateNode<MidiNote>): number { return this.viewportService.timeToPx(note.time()); }
	private getNoteRight(note: ObjectStateNode<MidiNote>): number { return this.viewportService.timeToPx(note.time()+note.duration()); }
	private getNoteBottom(note: ObjectStateNode<MidiNote>): number { return this.SCALE_HEIGHT/12 * note.note(); }
	private getNoteTop(note: ObjectStateNode<MidiNote>): number { return this.SCALE_HEIGHT/12 * (note.note()+1); }

	boxOverlayStyle() {
		const bounds = this.selectService.getNormalizedBoxBounds();
		if (!bounds) return { left: 0, top: 0, width: 0, height: 0 };
		
		const left = bounds.startX;
		const top = bounds.startY;
		const width = bounds.endX - bounds.startX;
		const height = bounds.endY - bounds.startY;
		
		return { left, top, width, height };
	}

	// ==========================================================================================
	// Event Handlers

	@HostListener('document:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (this.selectService.isBoxSelecting()) {
				this.selectService.cancelBoxSelect();
				this.isMouseDown = false;
				this.containerRef.nativeElement.classList.remove('box-selecting');
			}
			
			if (this.dragService.isDragging()) {
				this.dragService.cancelDrag();
				this.isMouseDown = false;
				this.containerRef.nativeElement.classList.remove('dragging', 'drag-ready');
			}
		}
		
		if (event.key === 'Delete' || event.key === 'Backspace') {
			if (this.selectService.hasSelectedNotes()) {
				this.midiService.deleteNotes(this.selectService.selectedNotes());
				this.selectService.clearSelection();
			}
		}
	}
		
}
