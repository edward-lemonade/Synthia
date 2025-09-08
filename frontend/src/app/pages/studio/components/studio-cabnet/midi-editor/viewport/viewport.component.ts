import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, Injector, Input, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { MidiNote, MidiRegion } from '@shared/types';
import { CabnetService } from '@src/app/pages/studio/services/cabnet.service';
import { EditingMode, MidiEditorService } from '@src/app/pages/studio/services/midi-editor/midi-editor.service';
import { PlaybackService } from '@src/app/pages/studio/services/playback.service';
import { RegionService } from '@src/app/pages/studio/services/region.service';
import { BoxSelectBounds } from '@src/app/pages/studio/services/region-select.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { ObjectStateNode } from '@src/app/pages/studio/state/state.factory';
import { getRegionGhostColor2 } from '@src/app/utils/color';
import { MidiSelectService } from '@src/app/pages/studio/services/midi-editor/midi-select.service';
import { MidiDragService } from '@src/app/pages/studio/services/midi-editor/midi-drag.service';
import { NoteComponent } from "./note/note.component";

@Component({
	selector: 'midi-editor-viewport',
	imports: [CommonModule, NoteComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #container class="container"
			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)"
			(mouseup)="onMouseUp($event)"
			>

			<canvas 
				#canvas 
				class="canvas"
				></canvas>

			<div #scrollContainer class="scroll-container" 
				(scroll)="onScroll()"
				(click)="onClick($event)"
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
					*ngFor="let regionNode of (regions!()); let regionIndex = index"
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

				<div class="notes">
					<midi-editor-note
						*ngFor="let note of notes(); let noteIndex = index;"
						[note]="note">
					</midi-editor-note>

					<div class="square"></div>
				</div>
			</div>
		</div>
	`,
	styleUrl: './viewport.component.scss'
})

export class ViewportComponent implements AfterViewInit {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;

	private isMouseDown = false;
	private dragThreshold = 5; // pixels to start drag

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public playbackService: PlaybackService,
		public midiService: MidiEditorService,
		public selectService: MidiSelectService,
		public dragService: MidiDragService,
		public tracksService: TracksService,
		public regionService: RegionService,
		public cabnetService: CabnetService,
	) {}

	get SCALES() { return this.midiService.SCALES };
	get SCALE_HEIGHT() { return this.midiService.SCALE_HEIGHT };
	get ROW_HEIGHT() { return this.midiService.ROW_HEIGHT };

	get totalWidth() { return ViewportService.instance.totalWidth() }
	get editingMode() { return MidiEditorService.instance.editingMode() }
	get track() { return this.cabnetService.selectedTrack }
	get regions() { return this.track()?.regions }
	notes = computed(() => { return this.regions!().flatMap((region) => {return (region as ObjectStateNode<MidiRegion>).midiData()})})
	get ghostColor() { return getRegionGhostColor2(this.track()!.color()) }

	
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
	// Actions

	private placeNote(event: MouseEvent) {
		const x = this.viewportService.mouseXToPx(event.clientX);
		const y = this.viewportService.mouseYToPx(event.clientY);

		const midiNote = this.midiService.pxToMidiNote(y);
		const start = this.viewportService.snapToGrid() ?
			this.viewportService.pxToPos(x - this.viewportService.posToPx(this.viewportService.smallestUnit())) :
			this.viewportService.pxToPos(x)
		const duration = this.midiService.drawNoteLength();
		const velocity = 0;
		const note: MidiNote = {
			start: start,
			midiNote: midiNote,
			velocity: velocity,
			duration: duration,
		}

		this.midiService.addNote(note);
	}

	// ==========================================================================================
	// Mouse Events

	onMouseDown(event: MouseEvent) {
		this.isMouseDown = true;
		
		if (event.button === 0 && 
			!this.dragService.isDragReady() && 
			!this.dragService.isDragging() && 
			!this.viewportService.isResizingRegion() &&
			this.editingMode == EditingMode.Select
		) {	
			const startX = this.viewportService.mouseXToPx(event.clientX);
			const startY = this.viewportService.mouseYToPx(event.clientY);

			if (!event.ctrlKey && !event.metaKey) { this.selectService.clearSelection(); }

			this.selectService.startBoxSelect(startX, startY);	
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.isMouseDown) {return}

		const currentMouseX = this.viewportService.mouseXToPx(event.clientX);
		const currentMouseY = this.viewportService.mouseYToPx(event.clientY);

		if (this.dragService.isDragReady()) {
			const deltaX = Math.abs(currentMouseX - this.dragService.dragInfo()!.startPosX*this.viewportService.measureWidth());

			if (deltaX >= this.dragThreshold) {
				this.dragService.startDrag();
			}
		}

		if (this.dragService.isDragging()) {
			const mousePosX = this.viewportService.pxToPos(currentMouseX, false);
			const midiNote = this.midiService.pxToMidiNote(currentMouseY);
			this.dragService.updateDrag(mousePosX, midiNote);
		} else if (this.selectService.isBoxSelecting()) {
			this.selectService.updateBoxSelect(currentMouseX, currentMouseY);
		}
	}

	onMouseUp(event: MouseEvent) {
		this.isMouseDown = false;
		
		if (this.dragService.isDragging()) {
			this.dragService.completeDrag();
		} else if (this.dragService.isDragReady()) {
			this.dragService.cancelDrag();	
		} else if (this.selectService.isBoxSelecting()) {
			if (this.selectService.shouldNullifyBoxSelect()) {
				this.playbackService.setPlaybackPx(this.viewportService.mouseXToPx(event.clientX), false, this.viewportService);
			}
			this.selectService.completeBoxSelect((bounds) => {
				return this.getNotesInBounds(bounds);
			});
		}
	}

	onClick(event: MouseEvent) {
		event.stopPropagation();
		if (this.editingMode == EditingMode.Draw && !this.dragService.isDragging()) {
			this.placeNote(event);
		}
	}

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

		notes().forEach((note, noteIndex) => {
			const noteTop = this.midiService.getNoteTop(note);
			const noteBottom = this.midiService.getNoteBottom(note);
			const noteLeft = this.midiService.getNoteLeft(note);
			const noteRight = this.midiService.getNoteRight(note);

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
		if (this.shouldIgnoreKeyEvent(event)) {	return; }

		if (event.key === 'Escape') {
			if (this.selectService.isBoxSelecting()) {
				this.selectService.cancelBoxSelect();
				this.isMouseDown = false;
				this.containerRef.nativeElement.classList.remove('box-selecting');

				event.stopPropagation();
				event.preventDefault();
			}
			
			if (this.dragService.isDragging()) {
				this.dragService.cancelDrag();
				this.isMouseDown = false;
				this.containerRef.nativeElement.classList.remove('dragging', 'drag-ready');

				event.stopPropagation();
				event.preventDefault();
			}
		}
		
		if (event.key === 'Delete' || event.key === 'Backspace') {
			if (this.selectService.hasSelectedNotes()) {
				this.midiService.deleteNotes(this.selectService.selectedNotes());
				this.selectService.clearSelection();

				event.stopPropagation();
				event.preventDefault();
			}
		}
	}
	
	private shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
		const target = event.target as Element;

		const tagName = target.tagName.toLowerCase();
		if (tagName === 'input' || 
			   tagName === 'textarea' || 
			   tagName === 'select' || 
			   target.hasAttribute('contenteditable') ||
			   target.closest('[contenteditable]') !== null) {
			return true;
		}

		if (event.defaultPrevented) {
			return true;
		}

		if (target.closest('app-rotary-knob') || 
			target.closest('mat-slider') ||
			target.closest('mat-menu')) {
			return true;
		}
		
		return false;
	}
}
