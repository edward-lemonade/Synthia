import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-loading-spinner',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="loading-container">
			{{ text }}
			<div 
				class="loading-spinner"
				[ngStyle]="{
					width: diameter + 'px',
					height: diameter + 'px',
					borderWidth: '4px',
					borderStyle: 'solid',
					borderColor: color2,
					borderTopColor: color
				}"
			></div>
		</div>
	`,
	styles: [`
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
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	`]
})
export class LoadingSpinnerComponent {
	@Input() text: string = 'Loading...';
	@Input() diameter: number = 40; //px
	@Input() color: string = '#ffffff';
	@Input() color2: string = this.color + '4f'

}
