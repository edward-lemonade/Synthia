import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { StudioEditorHeaderTracklistComponent } from "./tracklist-header/tracklist-header.component";
import { StudioEditorHeaderTimelineComponent } from "./timeline-header/timeline-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { TimelineComponent } from "./timeline/timeline.component";

@Component({
	selector: 'app-studio-editor',
	imports: [MatToolbar, StudioEditorHeaderTracklistComponent, StudioEditorHeaderTimelineComponent, TracklistComponent, TimelineComponent],
	template: `
		<mat-toolbar class="headers">
			<div class="container headers-tracklist-container">
				<div #topLeft>
					<studio-editor-tracklist-header/>
				</div>
			</div>
			<div class="container headers-timeline-container">
				<div #topRight>
					<studio-editor-timeline-header/>
				</div>
			</div>
		</mat-toolbar>

		<div class="body">
			<div class="container body-tracklist">
				<div #lowerLeft>
					<studio-editor-tracklist/>
				</div>
			</div>
			<div #lowerRight class="container body-timeline" (scroll)="onScroll()">
				<div #lowerRight>
					<studio-editor-timeline/>
				</div>
			</div>
		</div>
	`,
	styleUrl: './studio-editor.component.scss'
})
export class StudioEditorComponent implements AfterViewInit {
	@ViewChild('topLeft', { static: false }) topLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('topRight', { static: false }) topRight!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerLeft', { static: false }) lowerLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerRight', { static: false }) lowerRight!: ElementRef<HTMLDivElement>;

	private isScrolling = false;

	ngAfterViewInit(): void {
		setTimeout(() => {
			if (
				this.topLeft?.nativeElement && 
				this.topRight?.nativeElement && 
				this.lowerLeft?.nativeElement
			) {
				console.log("bruh");
				[this.topLeft.nativeElement, this.topRight.nativeElement, this.lowerLeft.nativeElement].forEach(element => {
					element.addEventListener('scroll', (e) => {
						e.preventDefault();
						e.stopPropagation();
					});
				});
			}
		}, 100);
	}

	onScroll(): void {
		console.log("scroll")
		if (this.isScrolling || !this.lowerRight?.nativeElement) return;
		
		this.isScrolling = true;
		const scrollLeft = this.lowerRight.nativeElement.scrollLeft;
		const scrollTop = this.lowerRight.nativeElement.scrollTop;
		
		// Sync horizontal with top-right
		if (this.topRight?.nativeElement) {
			this.topRight.nativeElement.style.transform = `translateX(-${scrollLeft}px)`;
		}
		
		// Sync vertical with lower-left  
		if (this.lowerLeft?.nativeElement) {
			this.lowerLeft.nativeElement.style.transform = `translateY(-${scrollTop}px)`;
		}
		
		this.isScrolling = false;
	}
}
