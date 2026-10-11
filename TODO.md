# GBA Emulator Project Progress

## Status: Skeleton Phase

This document tracks the development progress of the GBA emulator.

### Phase 1: Core Architecture (Complete)
- [x] Basic UI structure (HTML/CSS)
- [x] Emulator class skeleton
- [x] Canvas-based viewport setup
- [x] UI Control event listeners
- [x] ROM loading via File API
- [x] Main execution loop (requestAnimationFrame)

### Phase 2: Memory & CPU (In Progress)
- [x] Memory Map implementation (Unified Memory Controller)
- [x] IO Register handling (Keyboard, Display Control)
- [x] CPU Register state management (Banked registers, CPSR)
- [x] ARM7TDMI Core: Basic Instruction Dispatcher
- [x] ARM7TDMI Core: Basic ARM Instruction Set (MOV, ADD, SUB, B, LDR, STR)
- [x] ARM7TDMI Core: Basic Thumb Instruction Set (MOV, ADD, SUB, CMP, B)
- [ ] Complete ARM Instruction Set
- [ ] Complete Thumb Instruction Set
- [ ] Exception and Interrupt handling

### Phase 3: Graphics (PPU) (In Progress)
- [x] Scanline-based rendering architecture (Skeleton)
- [x] Bitmap Mode 3 implementation (240x160 15-bit color)
- [ ] Background layers (Tiled modes 0, 1, 2)
- [ ] Bitmap modes (4, 5)
- [ ] Sprite (OAM) rendering
- [ ] Palette support (BG and OBJ palettes)

### Phase 4: Audio & IO (TODO)
- [ ] APU implementation (Sound channels 1-4, Direct Sound)
- [ ] Joypad input mapping
- [ ] Timer system
- [ ] DMA (Direct Memory Access)
- [ ] Serial communication (Link cable)

### Phase 5: Optimization & Features (TODO)
- [ ] Save/Load States
- [ ] FPS Limiter / Sync to Audio
- [ ] Debugger / Disassembler view
- [ ] WebAssembly optimization for CPU core
