import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Component, signal } from "@angular/core";
import { AudioRecordingService } from "@src/app/pages/studio/services/audio-recording.service";

@Component({
	selector: 'device-selector-dialog',
	standalone: true,
	imports: [
		CommonModule, 
		FormsModule,
		MatDialogModule, 
		MatButtonModule, 
		MatSelectModule, 
		MatFormFieldModule
	],
	template: `
		<div class="device-dialog">
			Select Microphone
			<div class="content">
				Choose which microphone you'd like to use for recording:
				<mat-form-field appearance="outline" style="width: 100%; margin-top: 16px;">
					<mat-label>Microphone</mat-label>
					<mat-select [(ngModel)]="selectedDeviceId">
						<mat-option 
							*ngFor="let device of devices()" 
							[value]="device.deviceId">
							{{ device.label || 'Microphone ' + device.deviceId.substring(0, 8) }}
						</mat-option>
					</mat-select>
				</mat-form-field>
			</div>
			<div class="actions">
				<button class='btn' mat-dialog-close>Cancel</button>
				<button 
					mat-raised-button 
					class='btn'
					[mat-dialog-close]="selectedDeviceId"
					[disabled]="!selectedDeviceId">
					Start Recording
				</button>
			</div>
		</div>
	`,
	styleUrls: ['./device-selector-dialog.scss']
})
export class DeviceSelectorDialog {
	devices = signal<MediaDeviceInfo[]>([]);
	selectedDeviceId: string | null = null;

	constructor() {}

	setDevices(devices: MediaDeviceInfo[]): void {
		this.devices.set(devices);
		if (AudioRecordingService.instance.selectedDeviceId() != null) {
			this.selectedDeviceId = AudioRecordingService.instance.selectedDeviceId();
		} else if (devices.length > 0) {
			this.selectedDeviceId = devices[0].deviceId;
		}
	}
}