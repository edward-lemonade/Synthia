import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { createWaveformViewport } from '@src/app/utils/render-waveform';
import * as TimeUtils from '@src/app/utils/time';
import { TrackService } from '../track.service';
import { AvatarComponent } from '@src/app/components/avatar/avatar.component';

@Component({
	selector: 'app-track-comment',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule, AvatarComponent],
	template: `
		<div class="comments-section">
			<div class="comments-header">
				<h3>Comments</h3>
				<span class="comment-count">{{ this.tracksService.comments().length }}</span>
			</div>

			<!-- New Comment Form -->
			<div class="new-comment">
				<div class="comment-form">
					<mat-form-field appearance="outline" class="comment-input">
						<mat-label>Add a comment...</mat-label>
						<textarea 
							matInput 
							[(ngModel)]="newComment"
							(keydown.enter)="onSubmitComment()"
							[disabled]="isSubmittingComment"
							maxlength="500"
							rows="3">
						</textarea>
						<mat-hint align="end">{{ newComment.length }}/500</mat-hint>
					</mat-form-field>
					<button 
						mat-raised-button 
						color="primary"
						class="submit-comment-btn"
						(click)="onSubmitComment()"
						[disabled]="!newComment.trim() || isSubmittingComment">
						{{ isSubmittingComment ? 'Posting...' : 'Comment' }}
					</button>
				</div>
			</div>

			<div class="comments-list" *ngIf="tracksService.comments().length > 0">
				<div class="comment" *ngFor="let comment of tracksService.comments(); trackBy: trackComment">
					<app-avatar 
						[width]="40"
						[profilePictureURL]="comment.profilePictureURL"
						(click)="onPfpClick(comment.displayName)"
						[altText]="comment.displayName + ' avatar'">
					</app-avatar>
					<div class="comment-content">
						<div class="comment-header">
							<span class="comment-author">{{ comment.displayName }}</span>
							<span class="comment-time">{{ TimeUtils.timeAgo(comment.createdAt) }}</span>
						</div>
						<div class="comment-text">{{ comment.content }}</div>
					</div>
				</div>
			</div>

			<!-- No Comments State -->
			<div class="no-comments" *ngIf="tracksService.comments().length === 0">
				<mat-icon>chat_bubble_outline</mat-icon>
				<p>No comments yet. Be the first to share your thoughts!</p>
			</div>
		</div>
	`,
	styleUrls: ['./comment-section.component.scss', '../track.page.scss']
})
export class CommentSectionComponent {
	
	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public tracksService: TrackService,
	) {}

	TimeUtils = TimeUtils;
	projectId: string | null = null;
	get projectMetadata() { return this.tracksService.projectMetadata()! };
	get projectFront() { return this.tracksService.projectFront()! };

	newComment: string = '';
	isSubmittingComment: boolean = false;

	async onSubmitComment() {
		if (!this.newComment.trim() || this.isSubmittingComment) return;

		this.isSubmittingComment = true;
		
		try {
			const result = await this.tracksService.leaveComment(this.newComment.trim());
		} catch (error) {
			console.error('Failed to post comment:', error);
		} finally {
			this.isSubmittingComment = false;
		}
	}

	trackComment(index: number, comment: any): string {
		return comment.id;
	}

	onPfpClick(displayName: string) {
		this.router.navigate(['/profile', displayName]);
	}

}