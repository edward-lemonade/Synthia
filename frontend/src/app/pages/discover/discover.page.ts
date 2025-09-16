import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { DiscoverService } from './discover.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-discover',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule],
	providers: [DiscoverService],
	template: `

	`,
	styleUrls: ['./discover.page.scss']
})
export class DiscoverPage {
	projectId: string | null = null;
	

	constructor(
		private route: ActivatedRoute,
		public discoverService: DiscoverService
	) {}

}