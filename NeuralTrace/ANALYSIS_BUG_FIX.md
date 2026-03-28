# Critical Bug Fix: AI Analysis Returns Wrong Results

## Problem
No matter what changes you made to files and committed, the AI analysis always returned:
- ✗ "Low Impact detected"
- ✗ "All testbenches are up to date"
- ✗ Empty "Impacted Signals" section

## Root Cause
The frontend was comparing **identical code** to itself!

### What Was Happening:
1. User edits `motor_top.v` in the editor
2. Frontend checks: `if (activeFile === 'led_blinker.v')` ← **Wrong file name!**
3. Since `motor_top.v` ≠ `'led_blinker.v'`, the `workingRtl` state was **never updated**
4. On commit: `handleAnalyze(baselineRtl, workingRtl)` was comparing identical content
5. Backend received: `old_rtl = new_rtl` (100% match)
6. AI analysis said: "No changes detected" → Low risk, no stale testbenches

### The Bug Location:
**File**: [frontend/src/App.tsx](frontend/src/App.tsx#L770)

```typescript
// BEFORE (WRONG):
if (activeFile === 'led_blinker.v') {  // ← Hardcoded wrong filename!
  setWorkingRtl(newVal);
} else {
  setFileContents({ ...fileContents, [activeFile]: newVal });
}
```

The code was looking for a file called `'led_blinker.v'` but the default module file is `'motor_top.v'`. When users edited `motor_top.v`, their changes went into `fileContents` instead of `workingRtl`, making the analysis compare the same code twice!

---

## The Fix

Changed line 768-770 in [frontend/src/App.tsx](frontend/src/App.tsx):

```typescript
// AFTER (CORRECT):
if (activeFile === DEFAULT_MODULE_FILE) {  // ← Now checks the correct file!
  setWorkingRtl(newVal);
} else {
  setFileContents({ ...fileContents, [activeFile]: newVal });
}
```

Also line 781 (mode parameter):
```typescript
// BEFORE: mode={activeFile === 'led_blinker.v' ? editorMode : 'edit'}
// AFTER:  mode={activeFile === DEFAULT_MODULE_FILE ? editorMode : 'edit'}
```

---

## Test the Fix

### Test Case 1: Whitespace-Only Change
1. Edit `motor_top.v` - just add a blank line
2. Enter commit message
3. Expected: `stale_testbenches: []` (Low risk, no changes)

### Test Case 2: Signal Change
1. Edit `motor_top.v` - change signal name (e.g., `duty` → `duty_cycle`)
2. Enter commit message  
3. Expected: 
   - `modified_modules: ['motor_top']`
   - `changed_signals: ['duty_cycle']`
   - `stale_testbenches: ['tb_motor_top.v']` (likely)
   - `risk: 'Medium'` or higher

### Test Case 3: Parameter Change
1. Edit `motor_top.v` - change CLK_DIV from 20 to 40
2. Enter commit message
3. Expected:
   - `modified_modules: ['motor_top']`
   - `changed_blocks: ['PWM generator parameter']`
   - `stale_testbenches: ['tb_motor_top.v', 'tb_pwm_generator.v']`
   - `risk: 'Medium-High'`

### Test Case 4: Logic Block Change
1. Edit `motor_top.v` - modify an always block
2. Enter commit message
3. Expected:
   - `risk: 'High'`
   - Multiple stale testbenches

---

## How to Deploy

### Frontend Only (React):
```bash
cd frontend
npm run build
# or for development:
npm run dev
```

### Verify Both Services:
```bash
# Terminal 1: Backend
cd backend
python3 main.py

# Terminal 2: Frontend
cd frontend  
npm run dev
```

**Check**: When you edit `motor_top.v` now and save, you should see:
- The diff view updates
- When you commit, the analysis correctly identifies your changes
- Risk level and stale testbenches match your actual modifications

---

## Why This Bug Occurred

The hardcoded filename `'led_blinker.v'` was likely from:
- Previous project using a file called `led_blinker.v`
- Code copy-pasted but not updated for NeuralTrace
- Test setup that wasn't using `DEFAULT_MODULE_FILE` constant

The existing code used `DEFAULT_MODULE_FILE = 'motor_top.v'` everywhere else, so this one hardcoded reference was inconsistent and caused the bug.

---

## Related Files Updated
- **Frontend**: [frontend/src/App.tsx](frontend/src/App.tsx) (lines 768-781)
- **Backend AI**: [backend/core/ai.py](backend/core/ai.py) - Enhanced impact detection (bonus fix from earlier)

## Status
✅ **FIXED** - Ready to test!
