import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

import { Key, KeyListAligned } from 'src/app/lib/music';

@Component({
	selector: 'studio-toolbar-details-key',
	imports: [CommonModule, MatIcon, MatMenuModule, MatButtonModule],
	template: `
		<button mat-button [matMenuTriggerFor]="keyMenu" class="key-menu-btn">
			<mat-icon>music_note</mat-icon>
			<span [innerHTML]="getKeyDisplayHtml(selectedKey!)"></span>
		</button>
		<mat-menu #keyMenu="matMenu" class="key-menu">
			<div class="key-type-toggle">
				<button mat-button class="key-type-btn" [class.selected]="selectedKeyType === 'maj'" (click)="$event.stopPropagation(); setType('maj')">Major</button>
				<button mat-button class="key-type-btn" [class.selected]="selectedKeyType === 'min'" (click)="$event.stopPropagation(); setType('min')">Minor</button>
			</div>
			<div class="key-grid">
				<div class="accidentals-row">
					<span class="key-opt-space-half"></span>
					<ng-container *ngFor="let key of KeyListAligned[selectedKeyType]['acc']; let i = index">
						<ng-container *ngIf="key === null">
							<span class="key-opt-space"></span>
						</ng-container>
						<button *ngIf="key"
							mat-button
							class="key-option"
							[class.selected]="selectedKey!.display === key.display && selectedKeyType === key.type"
							(click)="setSelectedKey(key, 'acc', i); $event.stopPropagation()">
							<span [innerHTML]="getKeyDisplayHtml(key)"></span>
						</button>
					</ng-container>
				</div>
				<div class="naturals-row">
					<ng-container *ngFor="let key of KeyListAligned[selectedKeyType]['nat']; let i = index">
						<button
							mat-button
							class="key-option"
							[class.selected]="selectedKey!.display === key.display && selectedKeyType === key.type"
							(click)="setSelectedKey(key, 'nat', i); $event.stopPropagation()">
							{{ key.display }}
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

	selectedKeyType: 'maj'|'min' = 'maj';
	selectedKeyRow: 'nat'|'acc' = 'nat'
	selectedKeyIndex = 0;
	selectedKey: Key | null = KeyListAligned[this.selectedKeyType][this.selectedKeyRow][this.selectedKeyIndex]; // default Cmaj

	constructor(private sanitizer: DomSanitizer) {}

	getKeyDisplayHtml(key: Key): SafeHtml {
		let html = key.display[0];
		if (key.display[1])	{ html += `<sup style="vertical-align: super; line-height: 0;">${key.display[1]}</sup>`; }
		if (key.display[2]) { html += key.display[2]; }
		return this.sanitizer.bypassSecurityTrustHtml(html);
	}

	setSelectedKey(key: Key, row:'nat'|'acc', i: number) {
		this.selectedKeyRow = row;
		this.selectedKeyIndex = i;
		this.selectedKey = key;
	}
	setType(keyType: 'maj'|'min') { 
		this.selectedKeyType = keyType;
		this.selectedKey = KeyListAligned[this.selectedKeyType][this.selectedKeyRow][this.selectedKeyIndex];
	}
}
