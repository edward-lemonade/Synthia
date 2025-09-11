import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, Injector, Input, OnDestroy, signal} from '@angular/core';
import { CabnetService } from '@src/app/pages/studio/services/cabnet.service';
import { TimelinePlaybackService } from '@src/app/pages/studio/services/timeline-playback.service';
import { RegionService } from '@src/app/pages/studio/services/region.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { MidiSelectService } from '@src/app/pages/studio/services/midi-editor/midi-select.service';
import { MidiDragService } from '@src/app/pages/studio/services/midi-editor/midi-drag.service';
import { EditingMode, MidiEditorService } from '@src/app/pages/studio/services/midi-editor/midi-editor.service';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { AudioCacheService } from '@src/app/pages/studio/services/audio-cache.service';
import { MidiNote, Region } from '@shared/types';
import { ObjectStateNode } from '@src/app/pages/studio/state/state.factory';
import { DragGhostComponent } from "./ghosts/drag-ghost.component";
import { ResizeGhostComponent } from "./ghosts/resize-ghost.component";
import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';

type ResizeHandle = 'left' | 'right' | null;

export interface GhostNote {
	start: number;
	duration: number;
	region: ObjectStateNode<Region>;
}

@Component({
	selector: 'midi-editor-note',
	imports: [CommonModule, DragGhostComponent, ResizeGhostComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="note"
			[style.left.px]="LEFT_PX"
			[style.top.px]="TOP_PX"
			[style.width.px]="WIDTH_PX"
			[style.height.px]="HEIGHT_PX"

			[style.border-color]="isSelected() ? 'white' : 'black'"
			[style.opacity]="(viewportService.isResizingRegion() && isSelected()) ? '0.5' : '1'"
			
			(click)="onClick($event)"
			(mousedown)="onMouseDown($event)"
			(mousemove)="onMouseMove($event)">

			<!-- Resize handles for selected regions -->
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-left"
				(mousedown)="onResizeHandleMouseDown($event, 'left')"></div>
			<div *ngIf="isSelected() && canResize()" 
				class="resize-handle resize-handle-right"
				(mousedown)="onResizeHandleMouseDown($event, 'right')"></div>
		</div>
		
		<!-- Resize ghost -->	
		<midi-note-resize-ghost
			*ngIf="viewportService.isResizingRegion() && ghostNote()"
			[note]="note"
			[ghost]="ghostNote()"/>

		<!-- Drag ghost -->	
		<midi-note-drag-ghost
			*ngIf="dragService.isDragging() && isSelected()"
			[note]="note"/>
	`,
	styleUrl: './note.component.scss'
})

export class NoteComponent {
	@Input() note!: ObjectStateNode<MidiNote>;

	constructor (
		public stateService: StateService,
		public tracksService: TracksService,
		public selectionService: MidiSelectService,
		public regionSelectService: RegionSelectService,
		public dragService: MidiDragService,
		public viewportService: ViewportService,
		public audioCacheService: AudioCacheService,
		public regionService: RegionService,
		public midiService: MidiEditorService,
		public cabnetService: CabnetService,
	) {
		effect(() => {
			const scrollX = this.viewportService.measurePosX();
			const measureWidth = this.viewportService.measureWidth();
			const totalWidth = this.viewportService.totalWidth();
			const noteDuration = this.note.duration();
			const noteStart = this.note.start();
		});
	}

	get LEFT_PX() { return this.midiService.getNoteLeft(this.note) }
	get TOP_PX() { return this.midiService.getNoteTop(this.note) }
	get WIDTH_PX() { return this.midiService.getNoteRight(this.note) - this.midiService.getNoteLeft(this.note) }
	get HEIGHT_PX() { return this.midiService.ROW_HEIGHT }

	// ====================================================================================================
	// Fields

	get tracks() { return this.stateService.state.studio.tracks };

	isSelected = computed(() => {
		const selected = this.selectionService.isNoteSelected(this.note);
		return selected;
	});

	// ====================================================================================================
	// Resize System

	canResize = computed(() => { return this.selectionService.selectedNotesCount() === 1 && this.isSelected(); });
	private resizeHandle = signal<ResizeHandle>(null);
	private resizeStartPx = signal(0);
	private originalNote: MidiNote | null = null;

	ghostNote = signal<GhostNote | null>(null);
	ghostWidth = computed(() => {
		const ghost = this.ghostNote();
		return ghost ? `${this.viewportService.posToPx(ghost.duration)}px` : '0px';
	});
	ghostStartPos = computed(() => {
		const ghost = this.ghostNote();
		return ghost ? `${this.viewportService.posToPx(ghost.start)}px` : '0px';
	});

	onResizeHandleMouseDown(event: MouseEvent, handle: ResizeHandle) {
		event.preventDefault();
		event.stopPropagation();
		
		this.startResize(event, handle);
	}
	
	private startResize(event: MouseEvent, handle: ResizeHandle) {
		this.viewportService.isResizingRegion.set(true);
		this.resizeHandle.set(handle);
		this.resizeStartPx.set(event.clientX);
		
		this.originalNote! = this.note.snapshot();
		
		this.ghostNote.set({
			start: this.note.start(),
			duration: this.note.duration(),
			region: this.note.gp(),
		});
		
		document.addEventListener('mousemove', this.onResizeMove);
		document.addEventListener('mouseup', this.onResizeFinish);
	}

	private onResizeMove = (event: MouseEvent) => {
		if (!this.viewportService.isResizingRegion() || !this.originalNote) {
			return;
		}

		const deltaPx = event.clientX - this.resizeStartPx() + 8;
		const deltaPos = deltaPx / this.viewportService.measureWidth();
		const regionStart = this.ghostNote()!.region.start();

		const handle = this.resizeHandle();
		let newAbsStart = regionStart + this.originalNote.start;
		let newDuration = this.originalNote.duration;
		let newAbsEnd = regionStart + this.originalNote.start + this.originalNote.duration;
		
		if (handle === 'left') {
			newAbsStart = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(regionStart + this.originalNote.start + deltaPos)) :
				Math.max(0, regionStart + this.originalNote.start + deltaPos);
		} else if (handle === 'right') {
			newAbsEnd = this.viewportService.snapToGrid() ?
				Math.max(0, this.viewportService.snap(regionStart + this.originalNote.start + this.originalNote.duration + deltaPos)) :
				Math.max(0, regionStart + this.originalNote.start + this.originalNote.duration + deltaPos);
		}
		newDuration = Math.max(0.1, newAbsEnd - newAbsStart);

		this.ghostNote.set({
			start: newAbsStart - regionStart,
			duration: newDuration,
			region: this.note.gp(),
		});
	};

	private onResizeFinish = (event: MouseEvent) => {
		// Commit the final size from ghost to actual region
		const ghost = this.ghostNote();
		if (ghost) {
			this.midiService.resizeNote(this.note, ghost.start, ghost.duration);
		}
		
		this.viewportService.isResizingRegion.set(false);
		this.resizeHandle.set(null);
		this.originalNote = null;
		this.ghostNote.set(null);
		
		document.removeEventListener('mousemove', this.onResizeMove);
		document.removeEventListener('mouseup', this.onResizeFinish);
	};

	// ====================================================================================================
	// Events

	onClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		this.regionSelectService.setSelectedRegion(this.note.gp());
		if (this.midiService.editingMode() == EditingMode.Select && !this.dragService.isDragging()) {
			if (event.ctrlKey || event.metaKey) {
				this.selectionService.toggleSelectedNote(this.note);
			} else {
				this.selectionService.setSelectedNote(this.note);
			}
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.canResize() || this.viewportService.isResizingRegion() || this.dragService.isDragging()) {
			return;
		}

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const regionWidth = rect.width;
		
		// Define edge zones (8px from each edge)
		const edgeZone = 8;
		
		if (mouseX <= edgeZone) {
			this.resizeHandle.set('left');
		} else if (mouseX >= regionWidth - edgeZone) {
			this.resizeHandle.set('right');
		} else {
			this.resizeHandle.set(null);
		}
	}

	onMouseDown(event: MouseEvent) {
		event.preventDefault();

		if (this.midiService.editingMode() == EditingMode.Select) {
			if (this.canResize() && this.resizeHandle()) {
				this.startResize(event, this.resizeHandle()!);
			} else if (this.selectionService.isNoteSelected(this.note)) {
				const mousePxX = this.viewportService.mouseXToPx(event.clientX, false);
				const mousePosX = this.viewportService.pxToPos(mousePxX, false);
				const mousePxY = this.viewportService.mouseYToPx(event.clientY);
				const midiNote = this.midiService.pxToMidiNote(mousePxY);
				this.dragService.prepareDrag(mousePosX, midiNote, this.note);
			} else {
				event.stopPropagation();
			}
		} else if (this.midiService.editingMode() == EditingMode.Erase) {
			this.midiService.deleteNote(this.note);
		}
	}

	onContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	// ====================================================================================================
	// Note Actions

	duplicateNote() { this.midiService.duplicateNote(this.note); }
	deleteNote() { this.midiService.deleteNote(this.note); }
}
