import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { PlaybackService } from '../../../../services/playback.service';
import { SelectService } from '@src/app/pages/studio/services/select.service';

@Component({
	selector: 'studio-editor-playback-marker',
	imports: [CommonModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #marker class="marker">
			<div class="marker-handle" [style.pointer-events]="selectService.isBoxSelecting() ? 'none' : null"
				(mousedown)="onMouseDown($event)"
				(touchstart)="onTouchStart($event)"></div>
			<div class="marker-line" [style.pointer-events]="selectService.isBoxSelecting() ? 'none' : null"
				(mousedown)="onMouseDown($event)"
				(touchstart)="onTouchStart($event)"></div>
		</div>
	`,
	styleUrl: './playback-marker.component.scss'
})

export class PlaybackMarkerComponent {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("marker", {static: true}) markerRef!: ElementRef<HTMLDivElement>;

	public isDragging = false;
	private startX = 0;
	private startScrollLeft = 0;
	private startPlaybackPx = 0;
	
	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public playbackService: PlaybackService,
		public selectService: SelectService,
	) {

	}

	ngAfterViewInit(): void {
		runInInjectionContext(this.injector, () => {
			
			effect(() => {
				const playbackPx = this.playbackService.playbackPx();
				this.markerRef.nativeElement.style.left = playbackPx + 'px';
			})
		});
	}

	ngOnDestroy(): void {
		// Clean up any remaining event listeners
		this.stopDragging();
	}

	onMouseDown(event: MouseEvent): void {
		event.preventDefault();
		//event.stopPropagation();
		this.startDragging(event.clientX);
	}

	onTouchStart(event: TouchEvent): void {
		console.log("TOUCH")
		event.preventDefault();
		event.stopPropagation();
		if (event.touches.length === 1) {
			this.startDragging(event.touches[0].clientX);
		}
	}

	private startDragging(clientX: number): void {
		this.isDragging = true;
		this.startX = clientX;
		this.startPlaybackPx = this.playbackService.playbackPx();
		
		// Get scroll container from parent component
		const scrollContainer = this.getScrollContainer();
		this.startScrollLeft = scrollContainer?.scrollLeft || 0;

		// Add global event listeners
		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('mouseup', this.onMouseUp);
		document.addEventListener('touchmove', this.onTouchMove);
		document.addEventListener('touchend', this.onTouchEnd);

		// Add dragging class to marker
		this.markerRef.nativeElement.classList.add('dragging');
	}

	private onMouseMove = (event: MouseEvent): void => {
		if (this.isDragging) {
			this.updatePosition(event.clientX);
		}
	}

	private onTouchMove = (event: TouchEvent): void => {
		if (this.isDragging && event.touches.length === 1) {
			event.preventDefault();
			this.updatePosition(event.touches[0].clientX);
		}
	}

	private onMouseUp = (): void => {
		this.stopDragging();
	}

	private onTouchEnd = (): void => {
		this.stopDragging();
	}

	private updatePosition(clientX: number): void {
		const deltaX = clientX - this.startX;
		const scrollContainer = this.getScrollContainer();
		const currentScrollLeft = scrollContainer?.scrollLeft || 0;
		const scrollDelta = currentScrollLeft - this.startScrollLeft;
		
		// Calculate new position accounting for scroll changes
		const newPlaybackPx = this.startPlaybackPx + deltaX + scrollDelta;
		
		// Constrain to valid bounds
		const constrainedPx = Math.max(0, Math.min(newPlaybackPx, this.viewportService.totalWidth()));
		
		// Update the marker position immediately for smooth dragging
		this.markerRef.nativeElement.style.left = constrainedPx + 'px';
		
		// Update the playback service (convert px to time/position as needed)
		this.updatePlaybackPosition(constrainedPx);
	}

	private updatePlaybackPosition(pixelPosition: number): void {
		this.playbackService.setPlaybackPx(pixelPosition);
	}

	private stopDragging(): void {
		if (!this.isDragging) return;

		this.isDragging = false;

		// Remove global event listeners
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup', this.onMouseUp);
		document.removeEventListener('touchmove', this.onTouchMove);
		document.removeEventListener('touchend', this.onTouchEnd);

		// Remove dragging class
		this.markerRef.nativeElement.classList.remove('dragging');
	}

	private getScrollContainer(): HTMLDivElement | null {
		// Navigate up the DOM to find the scroll container
		let element = this.markerRef.nativeElement.parentElement;
		while (element) {
			if (element.classList.contains('scroll-container')) {
				return element as HTMLDivElement;
			}
			element = element.parentElement;
		}
		return null;
	}
}
