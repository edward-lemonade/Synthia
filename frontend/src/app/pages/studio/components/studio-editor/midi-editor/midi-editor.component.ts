import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';

import { MidiEditorService } from '../../../services/midi-editor.service';
import { MidiNote, MIDI_NOTE_MIN, MIDI_NOTE_MAX, getNoteName } from '@shared/types/studio';
import { ViewportService } from '../../../services/viewport.service';

@Component({
	selector: 'midi-editor',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatIconModule,
		MatButtonModule,
		MatSliderModule,
		MatMenuModule,
		MatDialogModule
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div *ngIf="midiService.isEditorOpen()" class="midi-editor-overlay" (click)="onOverlayClick($event)">
			<div class="midi-editor-container" (click)="$event.stopPropagation()">
				<!-- Header -->
				<div class="midi-editor-header">
					<div class="header-left">
						<h3>MIDI Editor</h3>
						<span class="region-info">{{ getRegionInfo() }}</span>
					</div>
					<div class="header-right">
						<button mat-icon-button (click)="closeEditor()">
							<mat-icon>close</mat-icon>
						</button>
					</div>
				</div>

				<!-- Toolbar -->
				<div class="midi-editor-toolbar">
					<div class="toolbar-left">
						<button mat-button (click)="addNote()" title="Add Note (Ctrl+N)">
							<mat-icon>add</mat-icon>
							Add Note
						</button>
						<button mat-button (click)="deleteSelectedNotes()" [disabled]="!midiService.hasSelectedNotes()" title="Delete Selected (Delete)">
							<mat-icon>delete</mat-icon>
							Delete
						</button>
						<button mat-button (click)="selectAllNotes()" title="Select All (Ctrl+A)">
							<mat-icon>select_all</mat-icon>
							Select All
						</button>
						<button mat-button (click)="clearSelection()" title="Clear Selection">
							<mat-icon>clear</mat-icon>
							Clear Selection
						</button>
					</div>
					<div class="toolbar-right">
						<button mat-button (click)="copySelectedNotes()" [disabled]="!midiService.hasSelectedNotes()" title="Copy (Ctrl+C)">
							<mat-icon>content_copy</mat-icon>
							Copy
						</button>
						<button mat-button (click)="pasteNotes()" title="Paste (Ctrl+V)">
							<mat-icon>content_paste</mat-icon>
							Paste
						</button>
					</div>
				</div>

				<!-- Piano Roll -->
				<div class="midi-editor-content">
					<!-- Piano Keys -->
					<div class="piano-keys">
						<div 
							*ngFor="let note of getPianoKeys(); let i = index"
							class="piano-key"
							[class.black-key]="isBlackKey(note)"
							[class.white-key]="!isBlackKey(note)"
							[class.selected]="isNoteSelected(note)"
							(click)="selectPianoKey(note, $event)"
						>
							<span class="note-name">{{ getNoteName(note) }}</span>
						</div>
					</div>

					<!-- Grid and Notes -->
					<div class="piano-roll" #pianoRoll (mousedown)="onPianoRollMouseDown($event)">
						<!-- Grid -->
						<div class="grid-container">
							<div 
								*ngFor="let beat of getBeats(); let i = index"
								class="grid-line"
								[class.beat-line]="i % 4 === 0"
								[style.left.px]="getBeatPosition(beat)"
							></div>
						</div>

						<!-- Notes -->
						<div 
							*ngFor="let note of midiService.notes(); let i = index"
							class="midi-note"
							[class.selected]="isNoteSelected(i.toString())"
							[style.left.px]="getNotePosition(note.start)"
							[style.width.px]="getNoteWidth(note.duration)"
							[style.bottom.px]="getNoteVerticalPosition(note.note)"
							[style.height.px]="noteHeight"
							(click)="selectNote(i, $event)"
							(mousedown)="startNoteDrag($event, i)"
						>
							<div class="note-handle note-handle-left" (mousedown)="startNoteResize($event, i, 'left')"></div>
							<div class="note-handle note-handle-right" (mousedown)="startNoteResize($event, i, 'right')"></div>
						</div>

						<!-- Note creation preview -->
						<div 
							*ngIf="isCreatingNote()"
							class="midi-note note-preview"
							[style.left.px]="getNotePosition(creatingNote().start || 0)"
							[style.width.px]="getNoteWidth(creatingNote().duration || 1)"
							[style.bottom.px]="getNoteVerticalPosition(creatingNote().note || 60)"
							[style.height.px]="noteHeight"
						></div>
					</div>
				</div>

				<!-- Properties Panel -->
				<div class="properties-panel" *ngIf="getSelectedNote()">
					<h4>Note Properties</h4>
					<div class="property">
						<label>Note:</label>
						<select [(ngModel)]="selectedNoteProperties.note" (change)="updateSelectedNote()">
							<option *ngFor="let note of getPianoKeys()" [value]="note">
								{{ getNoteName(note) }}
							</option>
						</select>
					</div>
					<div class="property">
						<label>Start:</label>
						<input type="number" [(ngModel)]="selectedNoteProperties.start" (change)="updateSelectedNote()" step="0.25">
					</div>
					<div class="property">
						<label>Duration:</label>
						<input type="number" [(ngModel)]="selectedNoteProperties.duration" (change)="updateSelectedNote()" step="0.25" min="0.25">
					</div>
					<div class="property">
						<label>Velocity:</label>
						<mat-slider min="1" max="127" step="1">
							<input matSliderThumb [(ngModel)]="selectedNoteProperties.velocity" (change)="updateSelectedNote()">
						</mat-slider>
						<span>{{ selectedNoteProperties.velocity }}</span>
					</div>
				</div>
			</div>
		</div>
	`,
	styleUrl: './midi-editor.component.scss'
})
export class MidiEditorComponent {
	@ViewChild('pianoRoll', { static: false }) pianoRollRef!: ElementRef<HTMLDivElement>;

	private readonly isCreating = signal<boolean>(false);
	private readonly isCreatingViaDrag = signal<boolean>(false);
	private readonly creatingNoteData = signal<Partial<MidiNote>>({});
	private readonly isDragging = signal<boolean>(false);
	private readonly isResizing = signal<boolean>(false);
	private readonly dragStartData = signal<{ x: number; y: number; noteIndex: number } | null>(null);
	private readonly resizeStartData = signal<{ x: number; noteIndex: number; handle: 'left' | 'right' } | null>(null);

	private creationStartBeat = 0;

	readonly noteHeight = 20;
	readonly pianoKeyWidth = 60;
	readonly gridSpacing = 60; // pixels per beat
	readonly gridSubdivision = 0.25; // quarter-beat snapping

	selectedNoteProperties = {
		note: 60,
		start: 0,
		duration: 1,
		velocity: 100,
		channel: 0
	};

	constructor(
		public midiService: MidiEditorService,
		private viewportService: ViewportService
	) {}

	@HostListener('document:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent) {
		if (!this.midiService.isEditorOpen()) return;

		switch (event.key) {
			case 'Delete':
			case 'Backspace':
				event.preventDefault();
				this.deleteSelectedNotes();
				break;
			case 'Escape':
				event.preventDefault();
				this.closeEditor();
				break;
			case 'a':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					this.selectAllNotes();
				}
				break;
			case 'c':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					this.copySelectedNotes();
				}
				break;
			case 'v':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					this.pasteNotes();
				}
				break;
			case 'n':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					this.addNote();
				}
				break;
		}
	}

	@HostListener('document:mousemove', ['$event'])
	onMouseMove(event: MouseEvent) {
		if (this.isCreating()) {
			if (this.isCreatingViaDrag()) {
				this.updateCreatingDuration(event);
			} else {
				this.updateCreatingHover(event);
			}
		} else if (this.isDragging()) {
			this.updateNoteDrag(event);
		} else if (this.isResizing()) {
			this.updateNoteResize(event);
		}
	}

	@HostListener('document:mouseup')
	onMouseUp() {
		if (this.isCreating()) {
			this.finishCreatingNote();
		} else if (this.isDragging()) {
			this.finishNoteDrag();
		} else if (this.isResizing()) {
			this.finishNoteResize();
		}
	}

	closeEditor() {
		this.midiService.closeEditor();
	}

	getRegionInfo(): string {
		const track = this.midiService.currentTrack();
		const region = this.midiService.currentRegion();
		if (!track || !region) return '';
		return `${track.name} - Region ${this.midiService.currentRegionIndexValue() + 1}`;
	}

	getPianoKeys(): number[] {
		const keys: number[] = [];
		for (let i = MIDI_NOTE_MAX; i >= MIDI_NOTE_MIN; i--) {
			keys.push(i);
		}
		return keys;
	}

	getBeats(): number[] {
		const region = this.midiService.currentRegion();
		if (!region) return [];
		
		const beats: number[] = [];
		for (let i = 0; i <= region.duration; i += 0.25) {
			beats.push(i);
		}
		return beats;
	}

	isBlackKey(note: number): boolean {
		const noteName = getNoteName(note);
		return noteName.includes('#');
	}

	isNoteSelected(noteId: string | number): boolean {
		const selectedNotes = this.midiService['selectedNotes']();
		return selectedNotes.has(noteId.toString());
	}

	getNoteName(note: number): string {
		return this.midiService.getNoteName(note);
	}

	getBeatPosition(beat: number): number {
		return beat * this.gridSpacing;
	}

	getNotePosition(start: number): number {
		return start * this.gridSpacing;
	}

	getNoteWidth(duration: number): number {
		return duration * this.gridSpacing;
	}

	getNoteVerticalPosition(note: number): number {
		const maxNote = MIDI_NOTE_MAX;
		return (maxNote - note) * this.noteHeight;
	}

	selectPianoKey(note: number, event: MouseEvent) {
		// Start creating a new note
		this.isCreating.set(true);
		this.creatingNoteData.set({
			note: note,
			start: 0,
			duration: 1,
			velocity: 100,
			channel: 0
		});
		this.isCreatingViaDrag.set(false);
		this.updateCreatingHover(event);
	}

	selectNote(noteIndex: number, event: MouseEvent) {
		const multiSelect = event.ctrlKey || event.metaKey;
		this.midiService.selectNote(noteIndex, multiSelect);
		this.updateSelectedNoteProperties();
	}

	startNoteDrag(event: MouseEvent, noteIndex: number) {
		event.stopPropagation();
		this.isDragging.set(true);
		this.dragStartData.set({
			x: event.clientX,
			y: event.clientY,
			noteIndex: noteIndex
		});
	}

	startNoteResize(event: MouseEvent, noteIndex: number, handle: 'left' | 'right') {
		event.stopPropagation();
		this.isResizing.set(true);
		this.resizeStartData.set({
			x: event.clientX,
			noteIndex: noteIndex,
			handle: handle
		});
	}

	onOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			this.closeEditor();
		}
	}

	addNote() {
		const newNote: MidiNote = {
			note: 60,
			start: 0,
			duration: 1,
			velocity: 100,
			channel: 0
		};
		this.midiService.addNote(newNote);
	}

	deleteSelectedNotes() {
		this.midiService.deleteSelectedNotes();
	}

	selectAllNotes() {
		this.midiService.selectAllNotes();
	}

	clearSelection() {
		this.midiService.clearSelection();
	}

	copySelectedNotes() {
		this.midiService.copySelectedNotes();
	}

	pasteNotes() {
		this.midiService.pasteNotes();
	}

	getSelectedNote(): MidiNote | null {
		const selectedNotes = this.midiService['selectedNotes']();
		if (selectedNotes.size !== 1) return null;
		
		const noteIndex = parseInt(Array.from(selectedNotes)[0]);
		const notes = this.midiService.notes();
		return notes[noteIndex] || null;
	}

	updateSelectedNoteProperties() {
		const selectedNote = this.getSelectedNote();
		if (selectedNote) {
			this.selectedNoteProperties = { ...selectedNote };
		}
	}

	updateSelectedNote() {
		const selectedNote = this.getSelectedNote();
		if (!selectedNote) return;

		const noteIndex = parseInt(Array.from(this.midiService['selectedNotes']())[0]);
		this.midiService.updateNote(noteIndex, this.selectedNoteProperties);
	}

	isCreatingNote(): boolean {
		return this.isCreating();
	}

	creatingNote(): Partial<MidiNote> {
		return this.creatingNoteData();
	}

	private updateCreatingHover(event: MouseEvent) {
		if (!this.isCreating()) return;
		const rect = this.pianoRollRef.nativeElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const start = this.snapBeat(Math.max(0, x / this.gridSpacing));
		const note = this.clampNote(MIDI_NOTE_MAX - Math.floor(y / this.noteHeight));
		this.creatingNoteData.set({
			...this.creatingNoteData(),
			start: start,
			note: note
		});
	}

	private updateCreatingDuration(event: MouseEvent) {
		if (!this.isCreating()) return;
		const rect = this.pianoRollRef.nativeElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const currentBeat = Math.max(0, x / this.gridSpacing);
		const rawDuration = Math.max(this.gridSubdivision, currentBeat - this.creationStartBeat);
		const duration = this.snapBeat(rawDuration);
		this.creatingNoteData.set({
			...this.creatingNoteData(),
			duration: duration
		});
	}

	onPianoRollMouseDown(event: MouseEvent) {
		// Avoid starting creation when clicking on an existing note or its handles
		const target = event.target as HTMLElement;
		if (target.closest('.midi-note')) {
			return;
		}

		const rect = this.pianoRollRef.nativeElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const start = this.snapBeat(Math.max(0, x / this.gridSpacing));
		const note = this.clampNote(MIDI_NOTE_MAX - Math.floor(y / this.noteHeight));

		this.creationStartBeat = start;
		this.isCreating.set(true);
		this.isCreatingViaDrag.set(true);
		this.creatingNoteData.set({
			note: note,
			start: start,
			duration: this.gridSubdivision,
			velocity: 100,
			channel: 0
		});
	}

	private finishCreatingNote() {
		if (!this.isCreating()) return;

		const noteData = this.creatingNoteData();
		if (noteData.note !== undefined && noteData.start !== undefined) {
			const newNote: MidiNote = {
				note: noteData.note,
				start: this.snapBeat(noteData.start),
				duration: this.snapBeat(noteData.duration || this.gridSubdivision),
				velocity: noteData.velocity || 100,
				channel: noteData.channel || 0
			};
			this.midiService.addNote(newNote);
		}

		this.isCreating.set(false);
		this.isCreatingViaDrag.set(false);
		this.creatingNoteData.set({});
	}

	private updateNoteDrag(event: MouseEvent) {
		// Implementation for dragging notes
	}

	private finishNoteDrag() {
		this.isDragging.set(false);
		this.dragStartData.set(null);
	}

	private updateNoteResize(event: MouseEvent) {
		// Implementation for resizing notes
	}

	private finishNoteResize() {
		this.isResizing.set(false);
		this.resizeStartData.set(null);
	}

	private snapBeat(value: number): number {
		const step = this.gridSubdivision;
		return Math.round(value / step) * step;
	}

	private clampNote(value: number): number {
		return Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, value));
	}
}
