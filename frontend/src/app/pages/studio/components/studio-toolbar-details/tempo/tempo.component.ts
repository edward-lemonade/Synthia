import { Component, WritableSignal } from '@angular/core';
import { CommonModule, Time } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { TimeSignature, TimeSigOptionsN, TimeSigOptionsD, DefaultTimeSignature } from '@shared_types/TimeSignature';

import { ProjectVarsService } from '../../../services/project-vars.service';

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
					[value]="bpm().toString()"
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
					<span class="time-sig-N">{{ timeSignature().N }}</span>
					<span class="time-sig-sep"> | </span> 
					<span class="time-sig-D">{{ timeSignature().D }}</span>
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
							[class.selected]="timeSignature().N === n"
							(click)="$event.stopPropagation(); timeSignature.set({N: n, D: timeSignature().D})">
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
							[class.selected]="timeSignature().D === d"
							(click)="$event.stopPropagation(); timeSignature.set({N: timeSignature().N, D: d})">
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
	constructor(public projectVarsService: ProjectVarsService) {
		this.bpm = projectVarsService.bpm;
		this.timeSignature = projectVarsService.timeSignature;
	}

	// METRONOME

	metronome = false;
	setMetronome(m : boolean) {
		this.metronome = m;
	}

	// BPM

	bpm: WritableSignal<number>;
	validateBpm(event: Event) {
		const input = (event.target as HTMLInputElement).value;
		
		if (/^\d*$/.test(input)) {
			let parsed = parseInt(input, 10);
			if (isNaN(parsed)) {parsed = 0};

			const finalBpm = Math.min(999, Math.max(1, parsed));
			this.bpm.set(finalBpm);
		}
		(event.target as HTMLInputElement).value = this.bpm().toString()
	}

	// TIME SIGNATURE

	timeSignature: WritableSignal<TimeSignature>;

	timeSigOptionsN = TimeSigOptionsN;
	timeSigOptionsD = TimeSigOptionsD;

	setTimeSigN(n: number) {
		this.timeSignature.set({ N: n as 2|3|4|5|6|7|8|9|10|11|12|13|14|15|16, D: this.timeSignature().D });
	}
	setTimeSigD(d: number) {
		this.timeSignature.set({ N: this.timeSignature().N, D: d as 2|4|8|16 });
	}
}
