import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-avatar',
	imports: [CommonModule, MatIconModule],
	template: `
		<div class="avatar-container" [style.width.px]="width" [style.height.px]="width">
			<img 
				*ngIf="profilePictureURL && !imageError()" 
				[src]="profilePictureURL" 
				[alt]="altText"
				class="avatar-image"
				(error)="onImageError()">
			<mat-icon 
				*ngIf="!profilePictureURL || imageError()"
				class="avatar-icon"
				[style.font-size.px]="width/2">
				{{ iconName }}
			</mat-icon>
		</div>
	`,
	styleUrls: ['./avatar.component.scss']
})
export class AvatarComponent {
	@Input() width: number = 40; // Default radius of 20px
	@Input() profilePictureURL: string | null | undefined = null;
	@Input() altText: string = 'Avatar';
	@Input() iconName: string = 'person';

	imageError = signal(false);

	onImageError() {
		this.imageError.set(true);
	}
}
