import { Component } from '@angular/core';

@Component({
	selector: 'studio-toolbar-details-time',
	imports: [],
	template: `
		<div class='time-container'>
			{{ timeFormatted }}
		</div>
	`,
	styleUrl: './time.component.scss'
})
export class TimeComponent {
	time = 0;
	timeFormatted = '00:00.0';

	setTime(t: number) {
		this.time = t;
		this.formatTime();
	}
	formatTime() {
		let secs = Math.floor(this.time);
		let frac = this.time - secs;
		let minutes = Math.floor(this.time / 60);
		secs = secs - minutes;
		return `${minutes}${secs}${frac}`
	}
}
