import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AvatarComponent } from '@src/app/components/avatar/avatar.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileService } from './profile.service';
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";

@Component({
	selector: 'app-profile',
	standalone: true,
	imports: [CommonModule, RouterModule, AvatarComponent, MatIconModule, MatProgressSpinnerModule, LoadingSpinnerComponent],
	providers: [ProfileService],
	template: `
		<div class="loading-container" *ngIf="!profileService.isDataLoaded">
			<div class="loading-content">
				<app-loading-spinner/>
			</div>
		</div>

		<div class="container" *ngIf="profileService.isDataLoaded && profileService.user()">
			<div class="profile-container">
				<div class="profile-card">
					<div class="shine"></div>
					<div class="profile-header">
						<app-avatar [width]="60" [profilePictureURL]="profileService.user()!.profilePictureURL" [altText]="profileService.user()!.displayName + ' avatar'"></app-avatar>
						<div class="profile-info">
							<h2>{{ profileService.user()!.displayName }}</h2>
						</div>
					</div>
					<p class="bio-block" *ngIf="profileService.user()!.bio">{{ profileService.user()!.bio }}</p>
				</div>

				<div class="released-card">
					<div class="released-section">
						<p>Released Songs</p>

						<div 
							class="released-list" 
							*ngIf="profileService.projects().length > 0; else noReleased">

							<div 
								class="released-item" 
								*ngFor="let track of profileService.projects()"
								(click)="onReleasedItemClick(track.metadata.projectId)">
								<div class="released-title">{{ track.front.title }}</div>
								<div class="released-meta">
									<mat-icon>calendar_today</mat-icon>
									<span>{{ track.front.dateReleased | date:'mediumDate' }}</span>
									
									<div class="stat">
										<mat-icon>play_arrow</mat-icon>
										<span>{{ track.front!.plays }}</span>
									</div>
									<div class="stat">
										<mat-icon>favorite</mat-icon>
										<span>{{ track.front!.likes }}</span>
									</div>
								</div>
							</div>

						</div>

						<ng-template #noReleased>
							<p class="no-released">No releases yet.</p>
						</ng-template>
					</div>
				</div>
			</div>
	`,
	styleUrls: ['./profile.page.scss']
})
export class ProfilePage {
	constructor(
		private route: ActivatedRoute, 
		private router: Router, 
		public profileService: ProfileService
	) {}

	async ngOnInit() {
		this.route.params.subscribe(async params => {
			const displayName = params['displayName'];
			await this.profileService.loadProfile(displayName);
		});
	}

	onReleasedItemClick(projectId: string) {
		this.router.navigate(['/track', projectId]);
	}
}
