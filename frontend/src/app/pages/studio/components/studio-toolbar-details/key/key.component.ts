import { Component, OnInit, WritableSignal, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Key, KeyListAligned } from '@shared_types/studio'

import { ProjectGlobalsService } from '../../../services/project-globals.service';

@Component({
	selector: 'studio-toolbar-details-key',
	imports: [CommonModule, FormsModule, MatIcon, MatMenuModule, MatButtonModule, MatButtonToggleModule],
	template: `
		<mat-button-toggle-group class='btn-group'>
			<button [matMenuTriggerFor]="keyMenu" class="key-menu-btn">
				<mat-icon>music_note</mat-icon>
				<span [innerHTML]="getKeyDisplayHtml(key())"></span>
			</button>
		</mat-button-toggle-group>
		<mat-menu #keyMenu="matMenu" class="key-menu">
			<div class="key-type-toggle">
				<button mat-button class="key-type-btn" [class.selected]="key().type === 'maj'" (click)="$event.stopPropagation(); setKeyType('maj')">Major</button>
				<button mat-button class="key-type-btn" [class.selected]="key().type === 'min'" (click)="$event.stopPropagation(); setKeyType('min')">Minor</button>
			</div>
			<div class="key-grid">
				<div class="accidentals-row">
					<span class="key-opt-space-half"></span>
					<ng-container *ngFor="let listedKey of KeyListAligned[key().type]['acc']; let i = index">
						<ng-container *ngIf="listedKey === null">
							<span class="key-opt-space"></span>
						</ng-container>
						<button *ngIf="listedKey"
							mat-button
							class="key-option"
							[class.selected]="key() == listedKey"
							(click)="setKey(listedKey); $event.stopPropagation()">
							<span [innerHTML]="getKeyDisplayHtml(listedKey)"></span>
						</button>
					</ng-container>
				</div>
				<div class="naturals-row">
					<ng-container *ngFor="let listedKey of KeyListAligned[key().type]['nat']; let i = index">
						<button
							mat-button
							class="key-option"
							[class.selected]="key() == listedKey"
							(click)="setKey(listedKey); $event.stopPropagation()">
							{{ listedKey.display }}
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

	constructor(public globalsService: ProjectGlobalsService, private sanitizer: DomSanitizer) {}

	key(): Key {
		return this.globalsService.get('key')();
	}

	setKey(key: Key) {
		this.globalsService.set('key', key);
	}

	setKeyType(keyType: 'maj'|'min') { 
		const newKey = KeyListAligned[keyType][this.key().acc ? 'acc' : 'nat'][this.key().alignedIdx];
		if (newKey) { this.setKey(newKey); }
	}

	getKeyDisplayHtml(key: Key): SafeHtml {
		let html = key.display[0];
		if (key.display[1])	{ 
			if (key.display[1] === 'm') {
				html += key.display[1];
			} else {
				html += `<sup style="vertical-align: super; line-height: 0;">${key.display[1]}</sup>`; 
			}
		}
		if (key.display[2]) { html += key.display[2]; }
		return this.sanitizer.bypassSecurityTrustHtml(html);
	}
}
