import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, Injector, Input, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { MidiService } from '@src/app/pages/studio/services/midi.service';
import { PlaybackService } from '@src/app/pages/studio/services/playback.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';

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

				<!-- Box selection overlay -->
				<div 
					*ngIf="midiService.isBoxSelecting()"
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
	) {}

	get totalWidth() { return ViewportService.instance.totalWidth() }

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

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// MOUSE EVENTS
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	onMouseDown(event: MouseEvent) {}
	onMouseUp(event: MouseEvent) {}
	onMouseMove(event: MouseEvent) {}
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// BOX SELECTION
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	boxOverlayStyle() {
		const bounds = this.midiService.getNormalizedBoxBounds();
		if (!bounds) return { left: 0, top: 0, width: 0, height: 0 };
		
		const left = bounds.startX;
		const top = bounds.startY;
		const width = bounds.endX - bounds.startX;
		const height = bounds.endY - bounds.startY;
		
		return { left, top, width, height };
	}
	

	/*
	private getRegionsInBounds(bounds: BoxSelectBounds): RegionPath[] {
		const selectedRegions: RegionPath[] = [];
		const tracks = this.tracks();
		
		const normalizedBounds = {
			left: Math.min(bounds.startX, bounds.endX),
			right: Math.max(bounds.startX, bounds.endX),
			top: Math.min(bounds.startY, bounds.endY),
			bottom: Math.max(bounds.startY, bounds.endY)
		};

		tracks.forEach((track, trackIndex) => {
			const trackTop = this.getTrackTopPosition(trackIndex);
			const trackBottom = trackTop + this.trackHeight;

			if (this.boundsIntersect(
				normalizedBounds.top, normalizedBounds.bottom,
				trackTop, trackBottom
			)) {
				track.regions().forEach((region, regionIndex) => {
					const regionLeft = region.start() * this.viewportService.measureWidth();
					const regionRight = regionLeft + (region.duration() * this.viewportService.measureWidth());
					
					if (this.boundsIntersect(
						normalizedBounds.left, normalizedBounds.right,
						regionLeft, regionRight
					)) {
						selectedRegions.push({ 
							trackId: this.tracksService.getTrack(trackIndex)!._id, 
							regionId: this.tracksService.getTrack(trackIndex)!.regions._ids()[regionIndex] 
						});
					}
				});
			}
		});

		return selectedRegions;
	}

	private boundsIntersect(start1: number, end1: number, start2: number, end2: number): boolean {
		return start1 <= end2 && end1 >= start2;
	}

	private getTrackTopPosition(trackIndex: number): number {
		return trackIndex * this.trackHeight;
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

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// EVENT HANDLERS
	///////////////////////////////////////////////////////////////////////////////////////////////////////

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
			if (this.selectService.hasSelectedRegions()) {
				this.regionService.deleteRegions(this.selectService.selectedRegions());
				this.selectService.clearSelection();
			}
		}

		if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
			event.preventDefault();
			this.selectService.selectAllRegions();
		}
	}
		*/
}
