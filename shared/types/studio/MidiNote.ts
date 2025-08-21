export interface MidiNote {
	note: number; // MIDI note number (0-127)
	start: number; // Start time in beats
	duration: number; // Duration in beats
	velocity: number; // Note velocity (0-127)
	channel: number; // MIDI channel (0-15)
}

export interface MidiRegionData {
	notes: MidiNote[];
	tempo?: number;
	timeSignature?: {
		numerator: number;
		denominator: number;
	};
}

// MIDI note constants
export const MIDI_NOTE_NAMES = [
	'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export const MIDI_NOTE_OCTAVES = 11; // 0-10 octaves
export const MIDI_NOTE_MIN = 0;
export const MIDI_NOTE_MAX = 127;

export function getNoteName(noteNumber: number): string {
	const noteName = MIDI_NOTE_NAMES[noteNumber % 12];
	const octave = Math.floor(noteNumber / 12) - 1;
	return `${noteName}${octave}`;
}

export function getNoteNumber(noteName: string): number {
	const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
	if (!match) return 60; // Default to middle C
	
	const [, note, octaveStr] = match;
	const octave = parseInt(octaveStr);
	const noteIndex = MIDI_NOTE_NAMES.indexOf(note);
	
	return (octave + 1) * 12 + noteIndex;
}
