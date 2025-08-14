import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TracksState } from '../../../state/subservices/tracks.state';
import { CommonModule } from '@angular/common';
import { ZoomScrollService } from '../../../services/zoom-scroll.service';
import { TrackComponent } from "./track/track.component";

@Component({
	selector: 'studio-editor-tracklist',
	imports: [CommonModule, TrackComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #scrollable class="container" (scroll)="onScroll()">
			<div class="tracks">
				<tracklist-track
					*ngFor="let track of getTracks(); let i = index"
					[track]="track"
					[index]="i"
				></tracklist-track>
			</div>
		</div>
	`,
	styleUrl: './tracklist.component.scss'
})
export class TracklistComponent implements OnInit {
	@ViewChild('scrollable', { static: true, read: ElementRef }) scrollable!: ElementRef<HTMLDivElement>;

	constructor (
		public tracksState : TracksState,
		public zoomScrollService : ZoomScrollService,
	) {}

	ngOnInit() {
		this.zoomScrollService.registerTracklistScrollable(this.scrollable.nativeElement);
  	}

	getTracks() { 
		return this.tracksState.get("arr")() 
	}

	onScroll() {
		const scrollPos = this.scrollable.nativeElement.scrollTop;
		if (scrollPos != this.zoomScrollService.windowPosY()) {
			this.zoomScrollService.setWindowPosY(scrollPos);
		}
	}
}
