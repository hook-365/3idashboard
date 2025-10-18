# Orbital Animation System - Testing Guide

**Quick verification steps for the newly implemented orbital animation system.**

---

## Quick Start

1. **Start the development server** (if not running):
   ```bash
   PORT=3020 npm run dev
   ```

2. **Navigate to test pages:**
   - Main page: http://localhost:3020/
   - Details page: http://localhost:3020/details

---

## Visual Tests

### 1. Camera Fly-In Animation (All Pages)

**Steps:**
1. Refresh the page (hard refresh: Cmd+Shift+R / Ctrl+Shift+F5)
2. Watch the 3D visualization load

**Expected Behavior:**
- Camera starts from far away (top-right distance)
- Smoothly flies toward the comet over ~2.5 seconds
- Ease-out motion (fast start, slow finish)
- Controls appear **after** fly-in completes

**Console Output:**
```
Camera fly-in: start=(-500.0, 300.0, 500.0), target=(...), end=(...)
Camera fly-in complete
```

### 2. Timeline Controls Appearance

**Expected UI (bottom center of 3D canvas):**
```
┌────────────────────────────────────────┐
│ ▶️ Play  [========●======] Oct 18, 2025│
│          Jan 2025 ────────── Dec 2025  │
│        Press Space to play/pause       │
└────────────────────────────────────────┘
```

**Verify:**
- [ ] Control panel visible at bottom
- [ ] Semi-transparent black background
- [ ] Large circular play button (left side)
- [ ] Timeline slider in center
- [ ] Current date displayed above slider
- [ ] Start/end dates displayed below slider
- [ ] "Press Space to play/pause" hint at bottom

### 3. Play Button

**Steps:**
1. Click the ▶️ Play button

**Expected Behavior:**
- [ ] Button icon changes to ⏸️ (pause)
- [ ] Current date starts advancing
- [ ] Comet starts moving along its orbital path
- [ ] Date updates in real-time above slider
- [ ] Slider thumb moves smoothly to the right

**Console Output:**
```
(No output for play/pause - silent operation)
```

### 4. Pause Button

**Steps:**
1. While animation is playing, click the ⏸️ Pause button

**Expected Behavior:**
- [ ] Button icon changes back to ▶️ (play)
- [ ] Date stops advancing
- [ ] Comet stops moving
- [ ] Current position maintained

### 5. Timeline Slider Scrubbing

**Steps:**
1. Pause animation (if playing)
2. Click and drag the slider thumb left or right

**Expected Behavior:**
- [ ] Current date updates as you drag
- [ ] Comet position jumps to match scrubbed date
- [ ] Date display above slider updates in real-time
- [ ] Animation automatically pauses when you start scrubbing
- [ ] Slider thumb has smooth hover effect (scales up slightly)

### 6. Keyboard Shortcut (Space)

**Steps:**
1. Focus on the page (click anywhere on body)
2. Press the Space key

**Expected Behavior:**
- [ ] Animation toggles play/pause
- [ ] Same effect as clicking the play/pause button
- [ ] Page does NOT scroll (preventDefault working)

**Console Output:**
```
Space key pressed - toggling animation
```

### 7. Animation Auto-Stop

**Steps:**
1. Click Play
2. Wait for animation to reach the end of the timeline

**Expected Behavior:**
- [ ] Animation stops automatically at end date
- [ ] Play button reappears (changes from ⏸️ to ▶️)
- [ ] Current date = timeline end date
- [ ] Comet at final position in projection

### 8. Theme Compatibility

**Steps:**
1. Toggle between themes (Dark → Light → High Contrast)
   - Use theme selector in the header

**Expected Behavior:**
- [ ] Play button color adapts to theme (`--color-chart-primary`)
- [ ] Slider track color adapts to theme
- [ ] Text colors remain readable in all themes
- [ ] Control panel background visible in all themes

---

## Technical Tests

### 9. Console Logs

**Open browser console** (F12 or Cmd+Option+I)

**Expected logs on page load:**
```
Fetching solar system data...
Solar system data received: {comet_position: {...}, ...}
Timeline range: 2025-07-20T00:00:00.000Z to 2025-12-31T23:59:59.999Z
Camera fly-in: start=(-500.0, 300.0, 500.0), target=(...), end=(...)
Three.js initialization complete
Camera fly-in complete
```

**Expected logs on Space key press:**
```
Space key pressed - toggling animation
```

**No errors should appear.**

### 10. Performance Check

**Steps:**
1. Click Play to start animation
2. Open browser DevTools → Performance tab
3. Record for 5-10 seconds
4. Stop recording and analyze

**Expected Metrics:**
- [ ] Frame rate: ~60 FPS (no drops)
- [ ] CPU usage: Moderate (animation loop + rendering)
- [ ] Memory: Stable (no continuous growth)
- [ ] No red/yellow warnings in timeline

### 11. Data Flow Verification

**Check API Response:**
1. Open Network tab in DevTools
2. Refresh page
3. Find request to `/api/solar-system-position?trail_days=90&refresh=true`
4. Inspect response JSON

**Verify Response Contains:**
```json
{
  "success": true,
  "data": {
    "orbital_trail": [
      { "x": ..., "y": ..., "z": ..., "date": "2025-07-20T00:00:00.000Z" },
      ...
    ],
    "orbital_projection": [
      { "x": ..., "y": ..., "z": ..., "date": "2025-10-31T00:00:00.000Z" },
      ...
    ],
    "planets": [
      {
        "name": "Earth",
        "orbital_path": [
          { "x": ..., "y": ..., "z": ..., "date": "..." },
          ...
        ]
      }
    ]
  }
}
```

**If `date` fields are missing:**
- Timeline controls will NOT appear (expected behavior)
- Fallback: current position only, no animation

---

## Edge Case Tests

### 12. Missing Orbital Data

**Simulate:**
1. Block API request in DevTools Network tab
2. Refresh page

**Expected Behavior:**
- [ ] 3D visualization loads with current position only
- [ ] Timeline controls do NOT appear
- [ ] No errors in console
- [ ] HUD and other controls still functional

### 13. Rapid Play/Pause Toggling

**Steps:**
1. Click play button
2. Immediately click pause
3. Repeat rapidly 5-10 times

**Expected Behavior:**
- [ ] No race conditions or crashes
- [ ] Animation state matches button icon
- [ ] Comet position stable (no jitter)

### 14. Slider Boundary Conditions

**Steps:**
1. Drag slider all the way to the left (start date)
2. Click Play
3. Let animation run briefly
4. Drag slider all the way to the right (end date)

**Expected Behavior:**
- [ ] Start date: Comet at first position in trail
- [ ] End date: Comet at last position in projection
- [ ] No errors when scrubbing to extremes
- [ ] Animation can resume from any scrubbed position

### 15. Mobile/Responsive View

**Steps:**
1. Open DevTools → Toggle device toolbar (Cmd+Shift+M)
2. Select iPhone or Android device
3. Refresh page

**Expected Behavior:**
- [ ] Timeline controls scale appropriately
- [ ] Play button remains clickable (not too small)
- [ ] Slider thumb easily draggable on touch
- [ ] Date text readable (not too small)
- [ ] Control panel fits within viewport width

---

## Regression Tests

### 16. Existing Features Still Work

**Verify these were NOT broken:**
- [ ] Grid toggle button (top-left)
- [ ] HUD toggle button (top-left)
- [ ] Center buttons (Sun, Earth, Atlas)
- [ ] Comet trail rendering
- [ ] Planet positions
- [ ] Sun and Earth rendering
- [ ] Orbital path lines
- [ ] Perihelion marker (orange crosshair)
- [ ] Labels (hover tooltips)
- [ ] Camera controls (rotate, zoom, pan)
- [ ] Theme switching

### 17. Other 3D Visualizations

**Navigate to:**
- Comets comparison page: http://localhost:3020/comets

**Verify:**
- [ ] MultiCometView loads correctly
- [ ] No timeline controls appear (this uses different component)
- [ ] All comets render correctly

---

## Browser Compatibility Tests

### 18. Cross-Browser Verification

**Test in multiple browsers:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

**Verify for each browser:**
- [ ] Camera fly-in works
- [ ] Play/pause button functional
- [ ] Timeline slider responds to drag
- [ ] Slider thumb styling renders correctly
- [ ] Space key toggles play/pause
- [ ] No console errors

---

## Success Criteria

**All tests pass if:**

1. ✅ Camera fly-in animation is smooth and completes successfully
2. ✅ Play button starts/stops animation as expected
3. ✅ Timeline slider accurately reflects and controls current date
4. ✅ Comet moves along orbital path when animation plays
5. ✅ Space key toggles play/pause (no page scroll)
6. ✅ Animation stops at timeline end automatically
7. ✅ Timeline controls appear after fly-in completes
8. ✅ No console errors during normal operation
9. ✅ Performance is smooth (60fps)
10. ✅ All existing features still functional

---

## Troubleshooting

### Timeline controls not appearing

**Possible causes:**
- Camera fly-in not complete (wait 2.5 seconds)
- API data missing `date` fields in orbital points
- `showControls={false}` prop set
- Loading/error state active

**Solution:** Check console for timeline range log

### Animation jerky/laggy

**Possible causes:**
- Low-end device (weak GPU)
- Other CPU-intensive processes running
- Browser DevTools open (reduces performance)

**Solution:** Close DevTools, close other tabs, try Chrome

### Comet not moving during animation

**Possible causes:**
- Orbital data not loaded
- Date out of range (before start or after end)
- Interpolation returning null

**Solution:** Check Network tab for API response, verify `orbital_trail` and `orbital_projection` exist

### Space key not working

**Possible causes:**
- Page not focused (click on body first)
- Input field focused (click outside input)
- Browser extension capturing Space key

**Solution:** Click on page background, ensure no inputs focused

### Slider thumb not visible

**Possible causes:**
- CSS not loaded
- Theme CSS variable undefined
- Browser doesn't support custom slider styling

**Solution:** Hard refresh (Cmd+Shift+R), check browser compatibility

---

## Reporting Issues

If you encounter issues during testing:

1. **Note the exact steps** to reproduce
2. **Capture console output** (screenshot or copy text)
3. **Check Network tab** for failed API requests
4. **Record browser** and OS version
5. **Describe expected vs. actual behavior**

**Reference:** See ORBITAL_ANIMATION_IMPLEMENTATION.md for full technical details

---

## Quick Fix Commands

```bash
# Hard refresh browser
Cmd+Shift+R (macOS) or Ctrl+Shift+F5 (Windows)

# Clear browser cache
Chrome: Cmd+Shift+Delete (macOS) or Ctrl+Shift+Delete (Windows)

# Restart dev server
Ctrl+C to stop, then:
PORT=3020 npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Check for linting issues
npm run lint
```

---

**Ready to test!** Start with Visual Tests 1-8, then proceed to Technical Tests and Edge Cases as needed.
