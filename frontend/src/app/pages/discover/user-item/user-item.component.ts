import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DiscoverService } from '../discover.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RelevantProjectOrUser } from '@shared/types';
import { AvatarComponent } from "@src/app/components/avatar/avatar.component";

@Component({
	selector: 'app-discover-user-item',
	imports: [CommonModule, RouterModule, FormsModule, AvatarComponent],
	template: `
		<div 
			class="item" 
			(click)="onItemClick()">
			<app-avatar
				[width]="40"
				[profilePictureURL]="item.user!.profilePictureURL!"
				[altText]="item.user!.displayName + ' avatar'">
			</app-avatar>
			<span class="display-name">{{ item.user!.displayName }}</span>

			<span class="label">User</span>
		</div>
	`,
	styleUrls: ['./user-item.component.scss']
})
export class UserItem {
	@Input() item!: RelevantProjectOrUser;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public discoverService: DiscoverService
	) {}

	onItemClick() {
		this.router.navigate(['/profile', this.item.user!.displayName]);
	}
}