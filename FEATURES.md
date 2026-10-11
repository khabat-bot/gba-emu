# GBA Emulator Technical Documentation

This file provides an overview of the current features and architecture of the GBA emulator for other AIs and developers.

## Architecture Overview

The emulator follows a modular class-based architecture in JavaScript, designed for maintainability and extensibility.

### Core Components

1.  **GBAEmulator (emulator.js)**: The main orchestrator. Manages the execution loop (`requestAnimationFrame`), timing (FPS calculation), and UI interactions.
2.  **Memory (Memory class)**: Implements the GBA memory map. Handles 8, 16, and 32-bit reads and writes across different memory regions (BIOS, EWRAM, IWRAM, IO, Palette, VRAM, OAM, and ROM).
3.  **ARM7TDMI (CPU class)**: A skeleton for the ARM7TDMI processor. Includes register state (R0-R15), CPSR, and a basic `step()` method. Start address is set to `0x08000000` (ROM).
4.  **PPU (Graphics class)**: Handles pixel rendering to an HTML5 Canvas. Currently implements a placeholder noise renderer to verify the execution loop.

## Implemented Features

### 1. Memory Management
- Full 28-bit address space mapping.
- Support for mirroring and region-specific access.
- `read8/16/32` and `write8/16/32` helper methods.
- **IO Registers**: Implemented initial support for `DISPCNT` (0x04000000) and `KEYINPUT` (0x04000130).

### 2. ARM7TDMI CPU Core
- **Register Banking**: Support for FIQ, SVC, ABT, IRQ, and UND mode registers.
- **CPSR/SPSR**: Full flag management (N, Z, C, V, T).
- **Instruction Sets**:
    - **ARM**: Implemented Branch (B, BL), Data Processing (MOV, ADD, SUB, AND, ORR, etc. with immediate support), and Load/Store (LDR, STR).
    - **Thumb**: Implemented Immediate operations (MOV, CMP, ADD, SUB), Unconditional Branch, and SWI placeholder.
- **Pipeline Simulation**: PC handling adjusted for the 3-stage pipeline (PC + 8 in ARM, PC + 4 in Thumb).

### 3. PPU (Graphics)
- **Mode 3**: Functional 15-bit color bitmap mode (240x160).
- **Execution Loop**: Unified rendering and CPU stepping synchronized via `requestAnimationFrame`.

### 4. User Interface & Input
- Modern, CSS-styled UI.
- **ROM Loading**: `FileReader` API support for `.gba` files.
- **Keyboard Input**: Fully mapped to GBA `KEYINPUT` register (Z/X for A/B, Arrows for D-Pad, etc.).

## How to use and extend

### CPU Implementation
The `ARM7TDMI.step()` method needs to be populated with instruction fetch, decode, and execute logic.
- **Fetch**: `this.mmu.read32(this.registers[15])`
- **Decode**: Use bitmasks to identify instruction types (Data Processing, Branch, Load/Store, etc.).
- **Execute**: Update registers and CPSR flags.

### PPU Implementation
The `PPU.renderFrame()` method should eventually iterate through scanlines and implement the different GBA background and sprite modes.

### IO Registers
IO registers (starting at `0x04000000`) need to be handled in the `Memory` class to support things like display control, interrupts, and DMA.
