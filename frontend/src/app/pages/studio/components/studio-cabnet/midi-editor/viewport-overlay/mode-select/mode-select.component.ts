import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { EditingMode, MidiEditorService } from "@src/app/pages/studio/services/midi-editor/midi-editor.service";

@Component({
	selector: 'midi-editor-mode-select',
	imports: [CommonModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='btn-group'>
			<button 
				class="btn"
				(click)="midiService.editingMode.set(EditingMode.Draw)"
				[class.selected]="midiService.editingMode() === EditingMode.Draw">
				<mat-icon>edit</mat-icon>
			</button>

			<button 
				class="btn"
				(click)="midiService.editingMode.set(EditingMode.Select)"
				[class.selected]="midiService.editingMode() === EditingMode.Select">
				<mat-icon>highlight_alt</mat-icon>
			</button>
			
			<button 
				class="btn"
				(click)="midiService.editingMode.set(EditingMode.Erase)"
				[class.selected]="midiService.editingMode() === EditingMode.Erase">
				<mat-icon>delete</mat-icon>
			</button>
		</div>
	`,
	styleUrl: './mode-select.component.scss'
})

/*
<button 
	class="btn"
	(click)="midiService.editingMode.set(EditingMode.Velocity)"
	[class.selected]="midiService.editingMode() === EditingMode.Velocity">
	V
</button>
*/

export class ModeSelectComponent {
	EditingMode = EditingMode;

	constructor (
		public midiService: MidiEditorService,
	) {}
}
