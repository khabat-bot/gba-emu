/**
 * GBA Emulator - Core Logic
 * 
 * Architecture:
 * - GBAEmulator: Main class, handles timing and UI.
 * - ARM7TDMI: CPU core (ARM and Thumb modes).
 * - Memory: Unified memory controller.
 * - PPU: Pixel Processing Unit for graphics.
 */

class Memory {
    constructor() {
        // GBA Memory Map
        this.bios = new Uint8Array(0x4000);        // 16KB BIOS
        this.ewram = new Uint8Array(0x40000);      // 256KB External WRAM
        this.iwram = new Uint8Array(0x8000);       // 32KB Internal WRAM
        this.io = new Uint8Array(0x400);           // 1KB I/O Registers
        this.palette = new Uint8Array(0x400);      // 1KB Palette RAM
        this.vram = new Uint8Array(0x18000);       // 96KB VRAM
        this.oam = new Uint8Array(0x400);          // 1KB OAM
        this.rom = null;                           // Game ROM (up to 32MB)

        // Initialize IO registers
        this.io.fill(0);
        this.write16(0x04000130, 0x03FF); // KEYINPUT (All keys released)
    }

    loadROM(data) {
        this.rom = new Uint8Array(data);
        console.log(`ROM loaded: ${this.rom.length} bytes`);
    }

    read8(addr) {
        addr &= 0x0FFFFFFF;
        const region = addr >> 24;
        const offset = addr & 0x00FFFFFF;

        switch (region) {
            case 0x00: return this.bios[offset % 0x4000];
            case 0x02: return this.ewram[offset % 0x40000];
            case 0x03: return this.iwram[offset % 0x8000];
            case 0x04: return this.io[offset % 0x400];
            case 0x05: return this.palette[offset % 0x400];
            case 0x06: return this.vram[offset % 0x18000];
            case 0x07: return this.oam[offset % 0x400];
            case 0x08:
            case 0x09:
            case 0x0A:
            case 0x0B:
            case 0x0C:
            case 0x0D:
                if (!this.rom) return 0;
                return this.rom[offset % this.rom.length];
            default: return 0;
        }
    }

    write8(addr, val) {
        addr &= 0x0FFFFFFF;
        const region = addr >> 24;
        const offset = addr & 0x00FFFFFF;

        switch (region) {
            case 0x02: this.ewram[offset % 0x40000] = val; break;
            case 0x03: this.iwram[offset % 0x8000] = val; break;
            case 0x04: this.io[offset % 0x400] = val; break;
            case 0x05: this.palette[offset % 0x400] = val; break;
            case 0x06: this.vram[offset % 0x18000] = val; break;
            case 0x07: this.oam[offset % 0x400] = val; break;
        }
    }

    // Helper methods for 16 and 32 bit access
    read16(addr) { return this.read8(addr) | (this.read8(addr + 1) << 8); }
    read32(addr) { return this.read16(addr) | (this.read16(addr + 2) << 16); }
    write16(addr, val) {
        this.write8(addr, val & 0xFF);
        this.write8(addr + 1, (val >> 8) & 0xFF);
    }
    write32(addr, val) {
        this.write16(addr, val & 0xFFFF);
        this.write16(addr + 2, (val >> 16) & 0xFFFF);
    }
}

class ARM7TDMI {
    constructor(memory) {
        this.mmu = memory;

        // Registers: 16 general purpose + banked registers for modes
        this.registers = new Uint32Array(16);
        this.banked = {
            fiq: new Uint32Array(7), // R8-R14
            svc: new Uint32Array(2), // R13-R14
            abt: new Uint32Array(2), // R13-R14
            irq: new Uint32Array(2), // R13-R14
            und: new Uint32Array(2)  // R13-R14
        };

        this.cpsr = 0; // Current Program Status Register
        this.spsr = 0; // Saved Program Status Register
        this.mode = 0x1F; // System Mode

        this.reset();
    }

    reset() {
        this.registers.fill(0);
        this.registers[15] = 0x08000000; // ROM Start
        this.cpsr = 0x1F; // System Mode
        this.mode = 0x1F;
    }

    getFlag(flag) {
        const shifts = { 'N': 31, 'Z': 30, 'C': 29, 'V': 28, 'T': 5 };
        return (this.cpsr >> shifts[flag]) & 1;
    }

    setFlag(flag, val) {
        const shifts = { 'N': 31, 'Z': 30, 'C': 29, 'V': 28, 'T': 5 };
        if (val) this.cpsr |= (1 << shifts[flag]);
        else this.cpsr &= ~(1 << shifts[flag]);
    }

    step() {
        const thumb = this.getFlag('T');
        if (thumb) {
            return this.executeThumb();
        } else {
            return this.executeARM();
        }
    }

    executeARM() {
        const instrAddr = this.registers[15];
        // In ARM mode, R15 is always current instruction address + 8
        const pc = instrAddr + 8;
        const instr = this.mmu.read32(instrAddr);

        // Advance PC for next instruction
        this.registers[15] += 4;

        if (!this.checkCondition(instr >> 28)) return 1;

        const type = (instr >> 25) & 0x7;
        switch (type) {
            case 0: // Data Processing / PSR Transfer
            case 1: // Data Processing / Immediate
                return this.armDataProcessing(instr, pc);
            case 2: // Load/Store Immediate Offset
                return this.armLoadStore(instr, pc);
            case 4: // Block Data Transfer (LDM/STM)
                return this.armBlockTransfer(instr, pc);
            case 5: // Branch
                return this.armBranch(instr, pc);
            default:
                return 1;
        }
    }

    checkCondition(cond) {
        const z = this.getFlag('Z');
        const c = this.getFlag('C');
        const n = this.getFlag('N');
        const v = this.getFlag('V');

        switch (cond) {
            case 0:  return z;             // EQ
            case 1:  return !z;            // NE
            case 2:  return c;             // CS/HS
            case 3:  return !c;            // CC/LO
            case 4:  return n;             // MI
            case 5:  return !n;            // PL
            case 6:  return v;             // VS
            case 7:  return !v;            // VC
            case 8:  return c && !z;       // HI
            case 9:  return !c || z;       // LS
            case 10: return n === v;       // GE
            case 11: return n !== v;       // LT
            case 12: return !z && (n === v); // GT
            case 13: return z || (n !== v); // LE
            case 14: return true;          // AL
            default: return false;
        }
    }

    armBranch(instr, pc) {
        const link = (instr >> 24) & 1;
        let offset = instr & 0xFFFFFF;
        if (offset & 0x800000) offset |= 0xFF000000; // Sign extend

        if (link) this.registers[14] = this.registers[15] - 4;
        this.registers[15] += (offset << 2);
        return 3;
    }

    armDataProcessing(instr, pc) {
        const opcode = (instr >> 21) & 0xF;
        const rd = (instr >> 12) & 0xF;
        const rn = (instr >> 16) & 0xF;
        const s = (instr >> 20) & 1;
        const i = (instr >> 25) & 1;

        let operand2;
        if (i) {
            // Immediate
            const imm = instr & 0xFF;
            const rot = (instr >> 8) & 0xF;
            operand2 = (imm >>> (rot * 2)) | (imm << (32 - rot * 2));
        } else {
            // Register (simplified - no shift yet)
            operand2 = this.registers[instr & 0xF];
        }

        let result;
        switch (opcode) {
            case 0x0: result = this.registers[rn] & operand2; break; // AND
            case 0x1: result = this.registers[rn] ^ operand2; break; // EOR
            case 0x2: result = this.registers[rn] - operand2; break; // SUB
            case 0x4: result = this.registers[rn] + operand2; break; // ADD
            case 0xC: result = this.registers[rn] | operand2; break; // ORR
            case 0xD: result = operand2; break; // MOV
            case 0xE: result = this.registers[rn] & ~operand2; break; // BIC
            case 0xF: result = ~operand2; break; // MVN
            default: result = 0;
        }

        if (rd !== 15) this.registers[rd] = result;
        else this.registers[15] = result & 0xFFFFFFFC; // Align PC

        if (s) {
            this.setFlag('N', (result >> 31) & 1);
            this.setFlag('Z', result === 0 ? 1 : 0);
            // TODO: C and V flags
        }
        return 1;
    }

    armLoadStore(instr, pc) {
        const p = (instr >> 24) & 1;
        const u = (instr >> 23) & 1;
        const b = (instr >> 22) & 1;
        const l = (instr >> 20) & 1;
        const rn = (instr >> 16) & 0xF;
        const rd = (instr >> 12) & 0xF;
        const imm = instr & 0xFFF;

        let addr = this.registers[rn];
        const offset = u ? imm : -imm;
        if (p) addr += offset;

        if (l) {
            this.registers[rd] = b ? this.mmu.read8(addr) : this.mmu.read32(addr);
        } else {
            if (b) this.mmu.write8(addr, this.registers[rd] & 0xFF);
            else this.mmu.write32(addr, this.registers[rd]);
        }

        if (!p) this.registers[rn] += offset;
        return 3;
    }

    armBlockTransfer(instr, pc) { return 4; }

    executeThumb() {
        const instrAddr = this.registers[15];
        const instr = this.mmu.read16(instrAddr);
        this.registers[15] += 2;

        const opcode = (instr >> 8) & 0xFF;
        
        // Thumb Instruction Decoder
        if ((opcode & 0xF8) === 0x18) { // ADD/SUB register
            return this.thumbAddSub(instr);
        } else if ((opcode & 0xE0) === 0x20) { // MOV/CMP/ADD/SUB immediate
            return this.thumbImmediate(instr);
        } else if ((opcode & 0xF0) === 0x40) { // ALU operations
            return this.thumbALU(instr);
        } else if ((opcode & 0xF0) === 0xB0) { // Push/Pop
            return this.thumbStack(instr);
        } else if ((opcode & 0xF0) === 0xDF) { // SWI
            return this.thumbSWI(instr);
        } else if ((opcode & 0xF0) === 0xE0) { // Unconditional branch
            return this.thumbBranch(instr);
        }
        
        return 1;
    }

    thumbImmediate(instr) {
        const opcode = (instr >> 11) & 0x3;
        const rd = (instr >> 8) & 0x7;
        const imm = instr & 0xFF;

        switch (opcode) {
            case 0: this.registers[rd] = imm; break; // MOV
            case 1: // CMP
                const res = this.registers[rd] - imm;
                this.setFlag('Z', res === 0 ? 1 : 0);
                this.setFlag('N', (res >> 31) & 1);
                break;
            case 2: this.registers[rd] += imm; break; // ADD
            case 3: this.registers[rd] -= imm; break; // SUB
        }
        return 1;
    }

    thumbBranch(instr) {
        let offset = instr & 0x7FF;
        if (offset & 0x400) offset |= 0xFFFFF800; // Sign extend
        this.registers[15] += (offset << 1);
        return 3;
    }

    thumbStack(instr) { return 2; }
    thumbALU(instr) { return 1; }
    thumbAddSub(instr) { return 1; }
    thumbSWI(instr) { 
        // Software Interrupt - used for BIOS calls
        // console.log(`SWI 0x${(instr & 0xFF).toString(16)}`);
        return 1; 
    }
}

class PPU {
    constructor(memory, canvas) {
        this.mmu = memory;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.imageData = this.ctx.createImageData(240, 160);
    }

    renderFrame() {
        const dispcnt = this.mmu.read16(0x04000000);
        const mode = dispcnt & 0x7;

        switch (mode) {
            case 3:
                this.renderMode3();
                break;
            default:
                this.renderPlaceholder();
                break;
        }

        this.ctx.putImageData(this.imageData, 0, 0);
    }

    renderMode3() {
        const data = this.imageData.data;
        for (let i = 0; i < 240 * 160; i++) {
            const color = this.mmu.read16(0x06000000 + i * 2);
            data[i * 4] = (color & 0x1F) << 3;
            data[i * 4 + 1] = ((color >> 5) & 0x1F) << 3;
            data[i * 4 + 2] = ((color >> 10) & 0x1F) << 3;
            data[i * 4 + 3] = 255;
        }
    }

    renderPlaceholder() {
        const data = this.imageData.data;
        const time = Date.now() / 500;
        for (let y = 0; y < 160; y++) {
            for (let x = 0; x < 240; x++) {
                const i = (y * 240 + x) * 4;
                data[i] = 40 + Math.sin(time + x/20) * 20;
                data[i + 1] = 40 + Math.cos(time + y/20) * 20;
                data[i + 2] = 80;
                data[i + 3] = 255;
            }
        }
    }
}

class GBAEmulator {
    constructor() {
        this.memory = new Memory();
        this.cpu = new ARM7TDMI(this.memory);
        this.ppu = new PPU(this.memory, document.getElementById('game-canvas'));
        
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.frameCount = 0;
        
        this.initUI();
    }

    initUI() {
        const romUpload = document.getElementById('rom-upload');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');

        romUpload.addEventListener('change', (e) => this.handleROMUpload(e));
        startBtn.addEventListener('click', () => this.start());
        pauseBtn.addEventListener('click', () => this.togglePause());
        resetBtn.addEventListener('click', () => this.reset());

        // Keyboard mappings
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    handleROMUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.memory.loadROM(e.target.result);
            document.getElementById('cpu-status').textContent = 'Ready';
            document.getElementById('start-btn').disabled = false;
            document.getElementById('reset-btn').disabled = false;
        };
        reader.readAsArrayBuffer(file);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        document.getElementById('cpu-status').textContent = 'Running';
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('start-btn').disabled = true;
        
        requestAnimationFrame((t) => this.loop(t));
    }

    togglePause() {
        this.paused = !this.paused;
        const btn = document.getElementById('pause-btn');
        btn.textContent = this.paused ? 'Resume' : 'Pause';
        document.getElementById('cpu-status').textContent = this.paused ? 'Paused' : 'Running';
    }

    reset() {
        this.cpu.reset();
        this.frameCount = 0;
        this.ppu.renderFrame();
        if (!this.running) this.start();
    }

    handleKey(e, isDown) {
        // GBA Keys: A, B, Select, Start, Right, Left, Up, Down, R, L
        const keyMap = {
            'KeyZ': 0,        // A
            'KeyX': 1,        // B
            'ShiftLeft': 2,   // Select
            'Enter': 3,       // Start
            'ArrowRight': 4,  // Right
            'ArrowLeft': 5,   // Left
            'ArrowUp': 6,     // Up
            'ArrowDown': 7,   // Down
            'KeyE': 8,        // R
            'KeyQ': 9         // L
        };

        const bit = keyMap[e.code];
        if (bit !== undefined) {
            e.preventDefault();
            let keyState = this.memory.read16(0x04000130);
            if (isDown) {
                keyState &= ~(1 << bit); // 0 = pressed
            } else {
                keyState |= (1 << bit);  // 1 = released
            }
            this.memory.write16(0x04000130, keyState);
        }
    }

    loop(timestamp) {
        if (!this.running) return;

        if (!this.paused) {
            // In a real emulator, we'd run a specific number of CPU cycles per frame
            // GBA Clock: 16.78 MHz. 60 FPS -> ~280,000 cycles per frame.
            for (let i = 0; i < 1000; i++) { // Throttle for now as it's a skeleton
                this.cpu.step();
            }
            
            this.ppu.renderFrame();
            this.frameCount++;
            
            // Update FPS every second
            if (timestamp - this.lastTime >= 1000) {
                document.getElementById('fps-counter').textContent = `${this.frameCount} FPS`;
                this.frameCount = 0;
                this.lastTime = timestamp;
            }
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start the emulator
window.onload = () => {
    new GBAEmulator();
};
