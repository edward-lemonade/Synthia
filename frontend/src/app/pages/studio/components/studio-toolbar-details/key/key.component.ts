import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { Key, KeyListAligned, KEY_INFO } from '@shared_types/studio'
import { StateService } from '../../../state/state.service';


@Component({
	selector: 'studio-toolbar-details-key',
	imports: [CommonModule, FormsModule, MatIcon, MatMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button [matMenuTriggerFor]="keyMenu" class="key-menu-btn">
			<mat-icon>music_note</mat-icon>
			<span [innerHTML]="getKeyDisplayHtml(key())"></span>
		</button>
	
		<mat-menu #keyMenu="matMenu" class="key-menu">
			<div class="key-type-toggle">
				<button class="key-type-btn" [class.selected]="KEY_INFO[key()].type === 'maj'" (click)="$event.stopPropagation(); setKeyType('maj')">Major</button>
				<button class="key-type-btn" [class.selected]="KEY_INFO[key()].type === 'min'" (click)="$event.stopPropagation(); setKeyType('min')">Minor</button>
			</div>
			<div class="key-grid">
				<div class="accidentals-row">
					<span class="key-opt-space-half"></span>
					<ng-container *ngFor="let listedKey of KeyListAligned[KEY_INFO[key()].type]['acc']; let i = index">
						<ng-container *ngIf="listedKey === null">
							<span class="key-opt-space"></span>
						</ng-container>
						<button *ngIf="listedKey"
							class="key-option"
							[class.selected]="key() == listedKey"
							(click)="key.set(listedKey); $event.stopPropagation()">
							<span [innerHTML]="getKeyDisplayHtml(listedKey)"></span>
						</button>
					</ng-container>
				</div>
				<div class="naturals-row">
					<ng-container *ngFor="let listedKey of KeyListAligned[KEY_INFO[key()].type]['nat']; let i = index">
						<button
							class="key-option"
							[class.selected]="key() == listedKey"
							(click)="key.set(listedKey); $event.stopPropagation()">
							{{ KEY_INFO[listedKey].display }}
						</button>
					</ng-container>
				</div>
			</div>
		</mat-menu>
	`,
	"styleUrls": ['./key.component.scss'],
})
export class KeyComponent {
	KeyListAligned = KeyListAligned;
	KEY_INFO = KEY_INFO

	constructor(
		private stateService: StateService, 
		private sanitizer: DomSanitizer
	) {}

	get key() { return this.stateService.state.studio.key; }

	setKeyType(keyType: 'maj'|'min') { 
		const info = KEY_INFO[this.key()];
		const newKey = KeyListAligned[keyType][info.acc ? 'acc' : 'nat'][info.alignedIdx];
		if (newKey) { this.key.set(newKey); }
	}

	getKeyDisplayHtml(key: Key): SafeHtml {
		const info = KEY_INFO[key]
		let html = info.display[0];
		if (info.display[1])	{ 
			if (info.display[1] === 'm') {
				html += info.display[1];
			} else {
				html += `<sup style="vertical-align: super; line-height: 0;">${info.display[1]}</sup>`; 
			}
		}
		if (info.display[2]) { html += info.display[2]; }
		return this.sanitizer.bypassSecurityTrustHtml(html);
	}
}
