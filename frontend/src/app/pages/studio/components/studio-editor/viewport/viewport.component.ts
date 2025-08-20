import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../services/project-state.service';
import { TrackComponent } from "./track/track.component";
import { BoxSelectBounds, SelectedRegion, SelectionService } from '../../../services/selection.service';

@Component({
	selector: 'studio-editor-viewport',
	imports: [CommonModule, TrackComponent],
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

			<div *ngIf="selectionService.isBoxSelecting()" 
				class="box-selection-overlay"
				[style.left.px]="boxOverlayStyle().left"
				[style.top.px]="boxOverlayStyle().top"
				[style.width.px]="boxOverlayStyle().width"
				[style.height.px]="boxOverlayStyle().height">
			</div>
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

	// Box selection state
	private isMouseDown = false;
	private startX = 0;
	private startY = 0;

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public projectState : ProjectState,
		public selectionService: SelectionService,
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
	// BOX SELECTION
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	onMouseDown(event: MouseEvent) {
		if (event.button === 0 && !this.isClickOnInteractiveElement(event.target as Element)) {
			this.isMouseDown = true;
			
			const tracksRect = this.tracksRef.nativeElement.getBoundingClientRect();
			const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
			const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;
			
			this.startX = event.clientX - tracksRect.left + scrollLeft;
			this.startY = event.clientY - tracksRect.top + scrollTop;
			
			if (!event.ctrlKey && !event.metaKey) {
				this.selectionService.clearSelection();
			}
			
			this.selectionService.startBoxSelect(this.startX, this.startY);
			
			this.containerRef.nativeElement.classList.add('box-selecting');
			
			event.preventDefault();
		}
	}

	onMouseMove(event: MouseEvent) {
		if (this.isMouseDown && this.selectionService.isBoxSelecting()) {
			// Get coordinates relative to the tracks container (accounting for scroll)
			const tracksRect = this.tracksRef.nativeElement.getBoundingClientRect();
			const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
			const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;
			
			const currentX = event.clientX - tracksRect.left + scrollLeft;
			const currentY = event.clientY - tracksRect.top + scrollTop;
			
			this.selectionService.updateBoxSelect(currentX, currentY);
		}
	}

	onMouseUp(event: MouseEvent) {
		if (this.isMouseDown && this.selectionService.isBoxSelecting()) {
			this.selectionService.completeBoxSelect((bounds) => {
				return this.getRegionsInBounds(bounds);
			});
		}
		
		this.isMouseDown = false;
		this.containerRef.nativeElement.classList.remove('box-selecting');
	}

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

	// HELPER METHODS

	private boundsIntersect(start1: number, end1: number, start2: number, end2: number): boolean {
		return start1 <= end2 && end1 >= start2;
	}

	private getTrackTopPosition(trackIndex: number): number {
		return trackIndex * this.trackHeight;
	}

	private isClickOnInteractiveElement(target: Element): boolean {
		return target.closest('viewport-track-region') !== null ||
			   target.closest('.track-header') !== null ||
			   target.closest('button') !== null ||
			   target.closest('input') !== null;
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

	// GLOBAL EVENT HANDLERS

	@HostListener('document:mouseup', ['$event'])
	onDocumentMouseUp(event: MouseEvent) {
		if (this.isMouseDown) {
			this.onMouseUp(event);
		}
	}

	@HostListener('document:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && this.selectionService.isBoxSelecting()) {
			this.selectionService.cancelBoxSelect();
			this.isMouseDown = false;
			this.containerRef.nativeElement.classList.remove('box-selecting');
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
