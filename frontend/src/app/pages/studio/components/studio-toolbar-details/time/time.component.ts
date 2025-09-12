import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelinePlaybackService } from '../../../services/timeline-playback.service';

@Component({
	selector: 'studio-toolbar-details-time',
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='time-container'>
			{{ formatTime(this.playbackService.playbackTimeDisplay()) }}
		</div>
	`,
	styleUrl: './time.component.scss'
})
export class TimeComponent {
	constructor(public playbackService: TimelinePlaybackService) {}

	formatTime(time: number): string {
		const minutes = Math.floor(time / 60);
		const seconds = time % 60;
		
		return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
	}
}