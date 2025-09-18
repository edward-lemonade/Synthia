import { Component, Input } from '@angular/core';

@Component({
	selector: 'app-loading-spinner',
	standalone: true,
	template: `
		<div class="loading-container">
			{{ text }}
			<div class="loading-spinner"></div>
		</div>
	`,
	styles: `
		.loading-container {
			display: flex;
			flex-direction: row;
			flex: 1;
			align-items: center;
			justify-content: center;
			
			gap: 1rem;
			color: white;
			font-size: 20px;
			font-weight: 500;
		}

		.loading-spinner {
			width: 40px;
			height: 40px;
			border: 4px solid #ffffff4f;
			border-top: 4px solid #ffffffff;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	`
})
export class LoadingSpinnerComponent {
	@Input() text: string = 'Loading...';
}