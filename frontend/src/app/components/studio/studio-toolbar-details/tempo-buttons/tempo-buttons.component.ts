import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { TimeSignature } from '@src/app/lib/music';

@Component({
	selector: 'studio-toolbar-details-tempo-buttons',
	imports: [CommonModule, FormsModule, MatButtonModule, MatButtonToggleModule, MatIcon, MatDivider, MatMenuModule],
	template: `
		<mat-button-toggle-group class='btn-group'>
			<button
				mat-button 
				class="tempo-btn metronome" 
				[class.selected]="metronome"
				(click)="setMetronome(!metronome)">
				<mat-icon>timer</mat-icon>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				mat-button 
				class="tempo-btn bpm">
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
				mat-button 
				[matMenuTriggerFor]="timeSigMenu"
				class="tempo-btn time-sig" >
				<div class="time-sig-wrapper">
					<span class="time-sig-N">{{ timeSig.N }}</span>
					<span class="time-sig-sep"> | </span> 
					<span class="time-sig-D">{{ timeSig.D }}</span>
				</div>	
			</button>
		</mat-button-toggle-group>
		<mat-menu #timeSigMenu="matMenu" class="time-sig-menu">

		</mat-menu>
	`,
	styleUrls: ['./tempo-buttons.component.scss']
})
export class TempoButtonsComponent {
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

	timeSig: TimeSignature = {N: 12, D: 1};
	setTimeSig(timeSig : TimeSignature) {
		this.timeSig = timeSig;
	}
}
