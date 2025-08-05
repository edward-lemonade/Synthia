import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { TimeSignature, TimeSigOptionsN, TimeSigOptionsD, TimeSigDefault } from '@shared_types/TimeSignature';

import { StudioService } from '../../../studio.service';

@Component({
	selector: 'studio-toolbar-details-tempo',
	imports: [CommonModule, FormsModule, MatButtonModule, MatButtonToggleModule, MatIcon, MatDivider, MatMenuModule],
	template: `
		<mat-button-toggle-group class='btn-group'>
			<button
				class="btn metronome" 
				[class.selected]="metronome"
				(click)="setMetronome(!metronome)">
				<mat-icon>timer</mat-icon>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn bpm">
				<input
					type="text"
					maxlength="3"
					[value]="bpm.toString()"
					(input)="validateBpm($event)"
					placeholder="bpm"
					class="bpm-number" />
				
				<span class="bpm-label">bpm</span>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				[matMenuTriggerFor]="timeSigMenu"
				class="btn time-sig" >
				<div class="time-sig-wrapper">
					<span class="time-sig-N">{{ timeSig.N }}</span>
					<span class="time-sig-sep"> | </span> 
					<span class="time-sig-D">{{ timeSig.D }}</span>
				</div>	
			</button>
		</mat-button-toggle-group>
		<mat-menu #timeSigMenu="matMenu" class="time-sig-menu">
			<div class="time-sig-menu-content">
				<div class="time-sig-column">
					<div class="time-sig-grid">
						<button 
							*ngFor="let n of timeSigOptionsN" 
							class="time-sig-option"
							[class.selected]="timeSig.N === n"
							(click)="$event.stopPropagation(); timeSig = {N: n, D: timeSig.D}">
							{{ n }}
						</button>
					</div>
				</div>
				<mat-divider class="time-sig-divider" [vertical]="true"></mat-divider>
				<div class="time-sig-column">
					<div class="time-sig-grid">
						<button 
							*ngFor="let d of timeSigOptionsD" 
							class="time-sig-option"
							[class.selected]="timeSig.D === d"
							(click)="$event.stopPropagation(); timeSig = {N: timeSig.N, D: d}">
							{{ d }}
						</button>
					</div>
				</div>
			</div>
		</mat-menu>
	`,
	styleUrls: ['./tempo.component.scss']
})

export class TempoComponent {
	constructor(public studioService: StudioService) {}

	// METRONOME

	metronome = false;
	setMetronome(m : boolean) {
		this.metronome = m;
	}

	// BPM

	get bpm(): number { return this.studioService.bpm(); }
	set bpm(value: number) { this.studioService.bpm.set(value); }
	validateBpm(event: Event) {
		const input = (event.target as HTMLInputElement).value;
		if (/^\d*$/.test(input)) {
			const parsed = parseInt(input, 10);
			if (!isNaN(parsed)) {
				const finalBpm = Math.min(999, Math.max(1, parsed));
				this.bpm = finalBpm;
			}
		}
		(event.target as HTMLInputElement).value = this.bpm.toString();
	}

	// TIME SIGNATURE

	get timeSig(): TimeSignature { return this.studioService.timeSignature(); }
	set timeSig(value: TimeSignature) { this.studioService.timeSignature.set(value); }
	timeSigOptionsN = TimeSigOptionsN;
	timeSigOptionsD = TimeSigOptionsD;

	setTimeSigN(n: number) {
		this.timeSig = { N: n as 2|3|4|5|6|7|8|9|10|11|12|13|14|15|16, D: this.timeSig.D };
	}

	setTimeSigD(d: number) {
		this.timeSig = { N: this.timeSig.N, D: d as 2|4|8|16 };
	}
}
