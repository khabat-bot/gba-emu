# GBA Emulator (JavaScript)

A Game Boy Advance (GBA) emulator built purely with HTML, CSS, and JavaScript — no external libraries required.

> **Note:** This is a skeleton/boilerplate GBA emulator demonstrating the project structure and basic framework. It provides the core user interface and emulator class architecture. A fully functional GBA emulator would require implementing the ARM7TDMI CPU, video hardware (GPU), audio hardware, and memory mapping.

## Documentation for Developers

- [TODO.md](./TODO.md) - Project roadmap and pending tasks.
- [FEATURES.md](./FEATURES.md) - Technical overview for AIs and developers.

## Features

- Clean, modern UI with a 240x160 canvas viewport
- Direct ROM loading via File API (.gba files)
- Start / Pause / Reset controls
- Modular architecture (CPU, Memory, PPU)
- Unified Memory Map implementation
- Real-time FPS counter

## Project Structure

```
gba/
├── index.html      # Main HTML page
├── style.css       # Styling
└── emulator.js     # Core emulator logic
```

## How to Run

1. Serve the files using any HTTP server. For example, with Python:
   ```bash
   python3 -m http.server 8000
   ```
2. Open your browser and navigate to `http://localhost:8000`

## Extending This Project

To make this a fully functional GBA emulator, you would need to add:

1. **ROM Loader** - Read and parse `.gb`, `.gba`, `.gbc`, `.sgb` files
2. **ARM7TDMI CPU** - The GBA's ARM7 processor (32-bit ARM, runs at 16.78 MHz)
3. **Video Hardware (GPU)** - 240x168 pixel display with background layers, sprites, and blend modes
4. **Audio Hardware (Sound)** - 2 PWM channels, 2 DSP channels
5. **Memory Map** - 32 MB address space with SRAM, VRAM, OAM, IO registers
6. **Input Handling** - Keyboard mapping for D-pad, A/B buttons, Start, Select
7. **Timing/Ly Counter** - Precise timing for vertical blank interrupts

## Keyboard Controls (to be implemented)

| Key | Action |
|-----|--------|
| Arrow Keys | D-Pad |
| Z | A Button |
| X | B Button |
| Enter | Start |
| Shift | Select |
| Q/E/R/T | L/R Buttons |

## License

MIT License - feel free to use this as a starting point for your own GBA emulator!
