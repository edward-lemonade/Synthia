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
	
	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public playbackService: PlaybackService,
		public selectService: SelectService,
	) {

	}

	ngAfterViewInit(): void {
		this.playbackService.registerPlaybackLine(this.markerRef.nativeElement);
		
		runInInjectionContext(this.injector, () => {
			effect(() => {
				const playbackPx = this.playbackService.playbackPx();
				this.markerRef.nativeElement.style.left = playbackPx + 'px';
			})
		});
	}

	ngOnDestroy(): void {
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

		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('mouseup', this.onMouseUp);
		document.addEventListener('touchmove', this.onTouchMove);
		document.addEventListener('touchend', this.onTouchEnd);

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
		const newPlaybackPx = this.viewportService.mouseXToPx(clientX, true);
		let constrainedPx = Math.max(0, Math.min(newPlaybackPx, this.viewportService.totalWidth()));

		this.markerRef.nativeElement.style.left = constrainedPx + 'px';

		this.playbackService.setPlaybackPx(constrainedPx);
	}

	private stopDragging(): void {
		if (!this.isDragging) return;

		this.isDragging = false;

		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup', this.onMouseUp);
		document.removeEventListener('touchmove', this.onTouchMove);
		document.removeEventListener('touchend', this.onTouchEnd);

		this.markerRef.nativeElement.classList.remove('dragging');
	}

}
