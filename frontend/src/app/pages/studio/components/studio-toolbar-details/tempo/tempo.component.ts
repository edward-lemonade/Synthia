import { ChangeDetectionStrategy, Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { TimeSigOptionsN, TimeSigOptionsD } from '@shared_types/studio/';
import { StateService } from '../../../state/state.service';

@Component({
	selector: 'studio-toolbar-details-tempo',
	imports: [CommonModule, FormsModule, MatIcon, MatDivider, MatMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='btn-group'>
			<button
				class="btn metronome" 
				[class.selected]="metronome"
				(click)="toggleMetronome()">	
				<mat-icon>timer</mat-icon>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn bpm">
				<input
					type="text"
					maxlength="3"
					[(ngModel)]="bpmDisplayValue"
					(blur)="commitBpmChange($event)"
					(keydown.enter)="commitBpmChange($event)"
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
		</div>

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
	constructor(public stateService: StateService) {
		effect(() => {
			this.bpmDisplayValue.set(this.bpm().toString());
		});
	}

	// METRONOME

	metronome = false;
	toggleMetronome() {
		this.metronome = !this.metronome;
	}

	// BPM

	get bpm() { return this.stateService.state.studio.bpm }
	bpmDisplayValue = signal(''); // placeholder

	commitBpmChange(event: Event) {
		const input = (event.target as HTMLInputElement).value.trim();

		if (input === '') {
			this.bpmDisplayValue.set(this.bpm().toString());
			return;
		}

		const parsed = parseFloat(input);
		if (!isNaN(parsed)) {
			const clampedValue = Math.min(999, Math.max(1, Math.round(parsed)));
			this.bpm.set(clampedValue);
			this.bpmDisplayValue.set(clampedValue.toString());
		} else {
			this.bpmDisplayValue.set(this.bpm().toString());
		}
	}

	// TIME SIGNATURE

	timeSigOptionsN = TimeSigOptionsN;
	timeSigOptionsD = TimeSigOptionsD;

	get timeSignature() { return this.stateService.state.studio.timeSignature; }
}