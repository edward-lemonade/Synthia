import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { TimeSignature, TimeSigMaxN, TimeSigMaxD, TimeSigDefault } from '@src/app/lib/music';

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
					[value]="bpmInput"
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
							*ngFor="let n of getNumeratorOptions()" 
							class="time-sig-option"
							[class.selected]="timeSig.N === n"
							(click)="$event.stopPropagation(); setTimeSig({N: n, D: timeSig.D})">
							{{ n }}
						</button>
					</div>
				</div>
				<mat-divider class="time-sig-divider" [vertical]="true"></mat-divider>
				<div class="time-sig-column">
					<div class="time-sig-grid">
						<button 
							*ngFor="let d of getDenominatorOptions()" 
							class="time-sig-option"
							[class.selected]="timeSig.D === d"
							(click)="$event.stopPropagation();setTimeSig({N: timeSig.N, D: d})">
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
	metronome = false;
	setMetronome(m : boolean) {
		this.metronome = m;
	}

	bpm = 140;
	bpmInput = this.bpm.toString();
	
	validateBpm(event: Event) {
		const input = (event.target as HTMLInputElement).value;

		if (/^\d*$/.test(input)) {
			this.bpmInput = input;
			const parsed = parseInt(input, 10);
			if (!isNaN(parsed)) {
				this.bpm = Math.min(999, Math.max(1, parsed));
			}
		}
		(event.target as HTMLInputElement).value = this.bpm.toString();
	}

	timeSig: TimeSignature = TimeSigDefault;
	setTimeSig(timeSig : TimeSignature) {
		this.timeSig = timeSig;
	}

	getNumeratorOptions(): TimeSignature['N'][] {
		return Array.from({length: TimeSigMaxN}, (_, i) => (i + 1) as TimeSignature['N']);
	}

	getDenominatorOptions(): TimeSignature['D'][] {
		return Array.from({length: TimeSigMaxD}, (_, i) => (i + 1) as TimeSignature['D']);
	}
}
