import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TracksState } from '../../../state/subservices/tracks.state';
import { CommonModule } from '@angular/common';
import { ZoomScrollService } from '../../../services/zoom-scroll.service';

@Component({
	selector: 'studio-editor-tracklist',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #scrollable class="container" (scroll)="onScroll()">
			<div class="tracks">
				<div 
					*ngFor="let track of getTracks(); let i = index"
					class="track"
					>
					{{ track.name }}
				</div>
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
