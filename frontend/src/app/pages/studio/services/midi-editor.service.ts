import { Injectable, signal, computed } from '@angular/core';
import { MidiNote, MidiRegionData, getNoteName } from '@shared/types/studio';
import { ProjectState } from './project-state.service';

@Injectable()
export class MidiEditorService {
	private readonly isOpen = signal<boolean>(false);
	private readonly currentTrackIndex = signal<number>(-1);
	private readonly currentRegionIndex = signal<number>(-1);
	private readonly selectedNotes = signal<Set<string>>(new Set());
	private readonly clipboard = signal<MidiNote[]>([]);

	// Computed values
	readonly isEditorOpen = computed(() => this.isOpen());
	readonly currentTrack = computed(() => {
		const index = this.currentTrackIndex();
		if (index < 0) return null;
		const tracks = this.projectState.tracksState.arr();
		return tracks[index] || null;
	});
	readonly currentRegion = computed(() => {
		const track = this.currentTrack();
		const regionIndex = this.currentRegionIndex();
		if (!track || regionIndex < 0 || regionIndex >= track.regions.length) return null;
		return track.regions[regionIndex];
	});
	readonly midiData = computed(() => {
		const region = this.currentRegion();
		if (!region || !region.isMidi) return { notes: [] };
		
		try {
			return JSON.parse(region.data[0] || '{"notes": []}') as MidiRegionData;
		} catch {
			return { notes: [] };
		}
	});
	readonly notes = computed(() => this.midiData().notes);
	readonly hasSelectedNotes = computed(() => this.selectedNotes().size > 0);
	readonly currentRegionIndexValue = computed(() => this.currentRegionIndex());

	constructor(private projectState: ProjectState) {}

	openEditor(trackIndex: number, regionIndex: number) {
		this.currentTrackIndex.set(trackIndex);
		this.currentRegionIndex.set(regionIndex);
		this.isOpen.set(true);
		this.selectedNotes.set(new Set());
	}

	closeEditor() {
		this.isOpen.set(false);
		this.currentTrackIndex.set(-1);
		this.currentRegionIndex.set(-1);
		this.selectedNotes.set(new Set());
	}

	addNote(note: MidiNote) {
		const currentData = this.midiData();
		const newData: MidiRegionData = {
			...currentData,
			notes: [...currentData.notes, note]
		};
		this.updateMidiData(newData);
	}

	updateNote(noteIndex: number, updates: Partial<MidiNote>) {
		const currentData = this.midiData();
		const newNotes = [...currentData.notes];
		newNotes[noteIndex] = { ...newNotes[noteIndex], ...updates };
		
		const newData: MidiRegionData = {
			...currentData,
			notes: newNotes
		};
		this.updateMidiData(newData);
	}

	deleteNote(noteIndex: number) {
		const currentData = this.midiData();
		const newNotes = currentData.notes.filter((_, index) => index !== noteIndex);
		
		const newData: MidiRegionData = {
			...currentData,
			notes: newNotes
		};
		this.updateMidiData(newData);
	}

	deleteSelectedNotes() {
		const currentData = this.midiData();
		const selectedIndices = Array.from(this.selectedNotes()).map(id => parseInt(id));
		const newNotes = currentData.notes.filter((_, index) => !selectedIndices.includes(index));
		
		const newData: MidiRegionData = {
			...currentData,
			notes: newNotes
		};
		this.updateMidiData(newData);
		this.selectedNotes.set(new Set());
	}

	selectNote(noteIndex: number, multiSelect: boolean = false) {
		const noteId = noteIndex.toString();
		const currentSelected = new Set(this.selectedNotes());
		
		if (multiSelect) {
			if (currentSelected.has(noteId)) {
				currentSelected.delete(noteId);
			} else {
				currentSelected.add(noteId);
			}
		} else {
			currentSelected.clear();
			currentSelected.add(noteId);
		}
		
		this.selectedNotes.set(currentSelected);
	}

	selectAllNotes() {
		const noteIds = this.notes().map((_, index) => index.toString());
		this.selectedNotes.set(new Set(noteIds));
	}

	clearSelection() {
		this.selectedNotes.set(new Set());
	}

	copySelectedNotes() {
		const selectedIndices = Array.from(this.selectedNotes()).map(id => parseInt(id));
		const notesToCopy = this.notes().filter((_, index) => selectedIndices.includes(index));
		this.clipboard.set(notesToCopy);
	}

	pasteNotes(offset: number = 0) {
		const notesToPaste = this.clipboard();
		if (notesToPaste.length === 0) return;

		const currentData = this.midiData();
		const newNotes = notesToPaste.map(note => ({
			...note,
			start: note.start + offset
		}));
		
		const newData: MidiRegionData = {
			...currentData,
			notes: [...currentData.notes, ...newNotes]
		};
		this.updateMidiData(newData);
	}

	getNoteName(noteNumber: number): string {
		return getNoteName(noteNumber);
	}

	private updateMidiData(data: MidiRegionData) {
		const trackIndex = this.currentTrackIndex();
		const regionIndex = this.currentRegionIndex();
		
		if (trackIndex < 0 || regionIndex < 0) return;

		const region = this.currentRegion();
		if (!region) return;

		const updatedRegion = {
			...region,
			data: [JSON.stringify(data)]
		};

		this.projectState.tracksState.setRegion(trackIndex, regionIndex, updatedRegion);
	}
}
