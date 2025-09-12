console.log("Starting import test...");

try {
    // Try importing everything first
    import("./../../shared/audio-processing/synthesis/midi-renderer").then(module => {
        console.log("Import successful!");
        console.log("Available exports:", Object.keys(module));
        console.log("MidiRenderer exists:", 'MidiRenderer' in module);
        console.log("MidiRenderer type:", typeof module.MidiRenderer);
    }).catch(error => {
        console.log("Import failed:", error.message);
        console.log("Stack:", error.stack);
    });
} catch (syncError) {
    console.log("Sync error:", syncError);
}