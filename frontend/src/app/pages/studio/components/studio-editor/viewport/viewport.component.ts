import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../services/project-state.service';
import { TrackComponent } from "./track/track.component";
import { BoxSelectBounds, SelectedRegion, RegionSelectService } from '../../../services/region-select.service';
import { DragGhostRegionsComponent } from "./drag-ghost-regions/drag-ghost-regions.component";
import { RegionDragService } from '../../../services/region-drag.service';

@Component({
	selector: 'studio-editor-viewport',
	imports: [CommonModule, TrackComponent, DragGhostRegionsComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #container class="container"
			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)"
			(mouseup)="onMouseUp($event)"
			[style.cursor]="
				(dragService.isDragging()) ? 'grabbing': 
				(dragService.isDragReady()) ? 'grab': 
				'default'
			">

			<canvas 
				#canvas 
				class="canvas"
				></canvas>

			<div #scrollContainer class="scroll-container" (scroll)="onScroll()">
				<div #tracks class="tracks" [style.width.px]="viewportService.totalWidth()">
					<viewport-track 
						*ngFor="let track of getTracks(); let i = index"
						class="track"
						[track]="track"
						[index]="i"
					/>
				</div>
			</div>
			
			<!-- Box selection overlay -->
			<div *ngIf="selectionService.isBoxSelecting()" 
				class="box-selection-overlay"
				[style.left.px]="boxOverlayStyle().left"
				[style.top.px]="boxOverlayStyle().top"
				[style.width.px]="boxOverlayStyle().width"
				[style.height.px]="boxOverlayStyle().height">
			</div>

			<!-- Drag preview overlay -->
			<drag-ghost-regions
				[tracks]="getTracks()"
				[trackHeight]="trackHeight"
				[tracksElement]="tracksRef.nativeElement"
				[containerElement]="containerRef.nativeElement"
				[scrollContainerElement]="scrollContainerRef.nativeElement">
			</drag-ghost-regions>
		</div>
	`,
	styleUrl: './viewport.component.scss'
})

export class ViewportComponent implements AfterViewInit {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("tracks", {static: true}) tracksRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;

	// Mouse interaction state
	private isMouseDown = false;
	private dragThreshold = 5; // pixels to start drag

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public projectState : ProjectState,
		public selectionService: RegionSelectService,
		public dragService: RegionDragService,
	) {}

	getTracks() { return this.projectState.tracksState.arr(); }
	trackHeight = 0;
	
	ngAfterViewInit(): void {
		const canvas = this.canvasRef.nativeElement;
		const ctx = canvas.getContext("2d")!;

		this.viewportService.registerVP(
			this.scrollContainerRef.nativeElement, canvas, ctx,
			this.scrollContainerRef.nativeElement.clientWidth, 
			Math.min(this.tracksRef.nativeElement.clientHeight, this.scrollContainerRef.nativeElement.clientHeight)
		);
		
		const observer = new ResizeObserver(() => {
			this.trackHeight = (this.tracksRef.nativeElement.clientHeight / this.getTracks().length);

			this.viewportService.setupCanvas(
				canvas, ctx,
				this.scrollContainerRef.nativeElement.clientWidth,
				Math.min(this.tracksRef.nativeElement.clientHeight, this.scrollContainerRef.nativeElement.clientHeight)
			);
		});
		observer.observe(this.tracksRef.nativeElement);

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

	onMouseDown(event: MouseEvent) {
		this.isMouseDown = true;
		
		if (event.button === 0 && 
			!this.dragService.isDragReady() && 
			!this.dragService.isDragging() && 
			!this.viewportService.isResizingRegion()
		) {	
			const tracksRect = this.tracksRef.nativeElement.getBoundingClientRect();
			const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
			const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;

			const startX = event.clientX - tracksRect.left + scrollLeft;
			const startY = event.clientY - tracksRect.top + scrollTop;

			if (!event.ctrlKey && !event.metaKey) { this.selectionService.clearSelection(); }
			
			this.selectionService.startBoxSelect(startX, startY);
			
			event.preventDefault();
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.isMouseDown) {return}

		const tracksRect = this.tracksRef.nativeElement.getBoundingClientRect();
		const scrollLeft = this.viewportService.windowPosX()
		const scrollTop = this.viewportService.windowPosY()
		
		const currentMouseX = event.clientX - tracksRect.left + scrollLeft;
		const currentMouseY = event.clientY - tracksRect.top + scrollTop;

		// Check if we should start dragging
		if (this.dragService.isDragReady()) {
			const deltaX = Math.abs(currentMouseX - this.dragService.dragInfo()!.startPosX*this.viewportService.measureWidth());

			if (deltaX >= this.dragThreshold) {
				this.dragService.startDrag();
			}
		}

		// Handle active operations
		if (this.dragService.isDragging()) {
			this.dragService.updateDrag(this.viewportService.mouseToPos(currentMouseX, false));
		} else if (this.selectionService.isBoxSelecting()) {
			this.selectionService.updateBoxSelect(currentMouseX, currentMouseY);
		}
	}

	onMouseUp(event: MouseEvent) {
		this.isMouseDown = false;
		
		if (this.dragService.isDragging()) {
			this.dragService.completeDrag();
		} else if (this.dragService.isDragReady()) {
			this.dragService.cancelDrag();	
		} else if (this.selectionService.isBoxSelecting()) {
			this.selectionService.completeBoxSelect((bounds) => {
				return this.getRegionsInBounds(bounds);
			});
		}
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// BOX SELECTION
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	private getRegionsInBounds(bounds: BoxSelectBounds): SelectedRegion[] {
		const selectedRegions: SelectedRegion[] = [];
		const tracks = this.getTracks();
		
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
				track.regions.forEach((region, regionIndex) => {
					const regionLeft = region.start * this.viewportService.measureWidth();
					const regionRight = regionLeft + (region.duration * this.viewportService.measureWidth());
					
					if (this.boundsIntersect(
						normalizedBounds.left, normalizedBounds.right,
						regionLeft, regionRight
					)) {
						selectedRegions.push({ trackIndex, regionIndex });
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
		const bounds = this.selectionService.getNormalizedBoxBounds();
		if (!bounds) return { left: 0, top: 0, width: 0, height: 0 };
		
		const tracksRect = this.tracksRef.nativeElement.getBoundingClientRect();
		const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
		const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
		const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;
		
		const left = bounds.startX - scrollLeft + (tracksRect.left - containerRect.left);
		const top = bounds.startY - scrollTop + (tracksRect.top - containerRect.top);
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
			if (this.selectionService.isBoxSelecting()) {
				this.selectionService.cancelBoxSelect();
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
			if (this.selectionService.hasSelectedRegions()) {
				this.projectState.tracksState.deleteRegions(this.selectionService.selectedRegions());
				this.selectionService.clearSelection();
			}
		}

		if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
			event.preventDefault();
			this.selectionService.selectAllRegions();
		}
	}
}
