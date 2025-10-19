# Code Optimization Roadmap

**Status**: In Progress
**Started**: 2025-10-18
**Last Updated**: 2025-10-18
**Backup Branch**: `optimization-backup-20251018`

## Phase 1: Code Cleanup & Logger Migration ⏳

### ✅ Completed
- **Duplicate ErrorBoundary removed** (152 lines saved)
  - Deleted: `/src/components/ErrorBoundary.tsx`
  - Kept: `/src/components/common/ErrorBoundary.tsx` (comprehensive version)
  - Impact: ~5KB bundle reduction
  - Status: ✅ Build verified successful

### 🔴 High Priority Remaining

#### 1. Logger Migration (46 files)
**Impact**: Production-ready structured logging with Pino
**Status**: NOT STARTED (automated approach failed)
**Approach**: Manual, file-by-file replacement

**Files to Update** (Priority order):
1. **API Routes (13 files)** - HIGHEST PRIORITY
   - `/src/app/api/comet-data/route.ts`
   - `/src/app/api/observations/route.ts`
   - `/src/app/api/observers/route.ts`
   - `/src/app/api/velocity/route.ts`
   - `/src/app/api/trend-analysis/route.ts`
   - `/src/app/api/simple-activity/route.ts`
   - `/src/app/api/additional-comets/route.ts`
   - `/src/app/api/analytics-bundle/route.ts`
   - `/src/app/api/comets-comparison/route.ts`
   - `/src/app/api/data-freshness/route.ts`
   - `/src/app/api/gallery-images/route.ts`
   - `/src/app/api/multi-comet-observations/route.ts`
   - `/src/app/api/solar-system-position/route.ts`

2. **Data Sources (5 files)**
   - `/src/lib/data-sources/nasa-sbdb.ts`
   - `/src/lib/data-sources/mpc.ts`
   - `/src/lib/data-sources/source-manager.ts`
   - `/src/lib/data-sources/theskylive.ts`
   - `/src/lib/data-sources/jpl-horizons.ts`

3. **Core Services (7 files)**
   - `/src/services/cobs-api.ts`
   - `/src/lib/planet-positions.ts`
   - `/src/lib/prediction-storage.ts`
   - `/src/lib/orbital-calculations.ts`
   - `/src/lib/orbital-path-calculator.ts`
   - `/src/lib/orbital-mechanics-pro.ts`
   - `/src/lib/orbital-bridge.ts`

**Migration Pattern**:
```typescript
// BEFORE
console.log('Fetching data...', params);
console.error('Failed:', error);

// AFTER
import logger from '@/lib/logger';
logger.info({ params }, 'Fetching data');
logger.error({ error: error.message, stack: error.stack }, 'Failed to fetch data');
```

**Important**: Frontend components (27 files) intentionally left with console.log for dev tools.

#### 2. Unused Imports (28 files)
**Impact**: Bundle size reduction, cleaner code
**Status**: NOT STARTED
**Approach**: Use TypeScript LSP or manual review

**Common patterns to remove**:
- Unused React imports
- Unused useState, useEffect, useMemo when not referenced
- Type imports that aren't used

#### 3. Commented Code Cleanup (8 files)
**Impact**: Code maintainability
**Status**: NOT STARTED
**Keep**: Actionable TODO comments
**Remove**: Old debug comments, dead code blocks

---

## Phase 2: Image Optimization 🖼️

### 🔴 Critical (Highest User Impact)
**Impact**: 3-4 second faster initial page loads
**Total Size**: ~4.3MB unoptimized images

### Images to Optimize

#### 1. Planet Textures (~3.5MB)
**Location**: `/public/textures/planets/`

Files:
- `mercury.jpg` (likely ~400KB)
- `venus.jpg` (likely ~500KB)
- `earth.jpg` (likely ~600KB)
- `mars.jpg` (likely ~400KB)
- `jupiter.jpg` (likely ~700KB)
- `saturn.jpg` (likely ~600KB)
- `uranus.jpg` (likely ~300KB)
- `neptune.jpg` (likely ~300KB)
- `pluto.jpg` (likely ~200KB)

**Tool**: imagemin with mozjpeg plugin
**Target**: 70% quality, ~1.2MB total (65% reduction)

#### 2. Gallery Research Images (~800KB)
**Location**: `/public/gallery/loeb-research/`

Files (11 total):
- `keck-kcwi-whitelight.png` (335KB)
- `keck-kcwi-spectrum.png` (214KB)
- `keck-kcwi-cn-ni-comparison.png` (119KB)
- `keck-kcwi-jets-radial.png` (759KB)
- `keck-kcwi-cn-ni-radial-diff.png` (507KB)
- `vlt-uves-ni-spatial.png` (70KB)
- `vlt-uves-fe-ni-spectra.png` (521KB)
- `vlt-uves-ni-fe-ratio-aug28.png` (55KB)
- `vlt-uves-ni-fe-ratio-sep12.png` (118KB)
- `vlt-ni-fe-vs-heliocentric.png` (116KB)
- `vlt-ni-production-rate.png` (95KB)

**Tool**: imagemin with pngquant plugin
**Target**: 80% quality, ~300KB total (60% reduction)

**Implementation Steps**:
```bash
# Install tools
npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant

# Create optimization script
# See OPTIMIZATION_SCRIPTS.md for full code

# Run optimization
node scripts/optimize-images.js

# Verify images still look good
# Test in browser at localhost:3020
```

---

## Phase 3: React Performance Optimizations ⚛️

### 🟡 Medium Priority

#### 1. React.memo (15 components identified)
**Impact**: Reduced re-renders, smoother UI
**Status**: NOT STARTED

**Top 5 Most Expensive Components** (prioritize these):
1. `/src/components/visualization/ModernSolarSystem.tsx` - 3D WebGL renderer
2. `/src/components/charts/LightCurve.tsx` - Large dataset rendering
3. `/src/components/charts/VelocityChart.tsx` - Complex calculations
4. `/src/components/maps/ObserverMap.tsx` - Map rendering
5. `/src/components/charts/OrbitalVelocityChart.tsx` - Multi-series data

**Pattern**:
```typescript
// BEFORE
export default function ExpensiveComponent({ data }: Props) {
  // ...
}

// AFTER
import { memo } from 'react';

function ExpensiveComponent({ data }: Props) {
  // ...
}

export default memo(ExpensiveComponent);
```

#### 2. useMemo/useCallback (23 opportunities)
**Impact**: Prevent unnecessary recalculations
**Status**: NOT STARTED
**Approach**: Profile with React DevTools first, optimize hot paths

**Common patterns**:
- Chart data transformations
- Filtered/sorted arrays
- Complex calculations in render
- Event handlers passed to child components

#### 3. Hard-coded Values → Constants (6 locations)
**Impact**: Code maintainability
**Status**: NOT STARTED

---

## Phase 4: TypeScript Quality 📘

### 🟢 Low Priority (Code Quality)

#### 1. Fix `any` Types (12 locations)
**Impact**: Type safety, better IDE support
**Status**: NOT STARTED

**Common locations**:
- API response types
- Chart.js callback types
- Event handler types

#### 2. Improve Type Definitions
**Impact**: Developer experience
**Status**: NOT STARTED

---

## Known Issues & Lessons Learned

### ❌ What NOT to Do

#### 1. Automated Bulk Replacements
**Issue**: astronomy-dashboard-dev agent attempted to replace all console.log statements automatically across 46 files.

**Result**: Syntax errors in 3+ files:
- `/src/lib/data-sources/source-manager.ts` - Import statement split incorrectly
- `/src/app/api/solar-system-position/route.ts` - Missing `import {` declaration
- `/src/app/api/gallery-images/route.ts` - Interface declarations accidentally removed

**Root Cause**: Agent removed code too aggressively without understanding full context.

**Lesson**: Large-scale refactors need careful manual review, even with agents.

**Recovery**: Restored from `optimization-backup-20251018` branch.

### ✅ What DOES Work

#### 1. Manual, Incremental Changes
- Make changes to 1-3 files at a time
- Build and test after each batch
- Commit frequently with descriptive messages

#### 2. Backup Branches
- Always create backup before large refactors
- Use date-stamped branch names: `optimization-backup-YYYYMMDD`
- Don't delete until sure optimization is stable

---

## Implementation Guide for Next Session

### Step 1: Logger Migration (1-2 hours)

**File-by-file approach**:
```bash
# 1. Pick one API route
# 2. Add import
# 3. Replace console.* with logger.*
# 4. Test build: npm run build
# 5. If successful, commit
# 6. Repeat for next file
```

**Commit after every 3-5 files** to maintain safety.

### Step 2: Image Optimization (30 minutes)

**Create script** at `/scripts/optimize-images.js`:
```javascript
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

(async () => {
  // Planet textures (JPEG)
  await imagemin(['public/textures/planets/*.jpg'], {
    destination: 'public/textures/planets',
    plugins: [
      imageminMozjpeg({ quality: 70 })
    ]
  });

  // Research images (PNG)
  await imagemin(['public/gallery/loeb-research/*.png'], {
    destination: 'public/gallery/loeb-research',
    plugins: [
      imageminPngquant({ quality: [0.6, 0.8] })
    ]
  });

  console.log('Images optimized!');
})();
```

**Run**:
```bash
npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant
node scripts/optimize-images.js
```

**Verify**: Check images in browser look acceptable, commit if good.

### Step 3: React.memo Top 5 (1 hour)

**Order**:
1. ModernSolarSystem (biggest impact)
2. LightCurve
3. VelocityChart
4. ObserverMap
5. OrbitalVelocityChart

**Test after EACH component** - ensure no visual regressions.

---

## Success Criteria

### Phase 1 Success
- [ ] All API routes use structured logger
- [ ] No console.* in production backend code
- [ ] Build passes with no errors

### Phase 2 Success
- [ ] Total image size < 2MB (from ~4.3MB)
- [ ] Images look good visually
- [ ] Page load 3-4 seconds faster

### Phase 3 Success
- [ ] Top 5 components wrapped in memo()
- [ ] No visual regressions
- [ ] Smoother UI interactions

---

## Estimated Time Investment

| Phase | Time | Impact | Priority |
|-------|------|--------|----------|
| Logger migration (API routes only) | 1-2 hrs | High | 🔴 High |
| Image optimization | 30 min | VERY High | 🔴 Critical |
| React.memo (top 5) | 1 hr | Medium | 🟡 Medium |
| **Total for high-impact items** | **2.5-3.5 hrs** | **Production ready** | - |

---

## Git Workflow

### Branches
- `main` - Current stable code
- `optimization-backup-20251018` - Safe restore point (DO NOT DELETE until optimization complete)
- Future: Create `optimization-phase-N` branches for each phase

### Commits
**Small, frequent commits**:
- After every 3-5 file logger migrations
- After image optimization (separate commit)
- After each React.memo component
- Include impact in commit message

**Example commit messages**:
```
feat: migrate API routes to structured logger (1/3)

- Migrated comet-data, observations, observers routes
- All use Pino logger with structured JSON output
- Build verified successful

Impact: Production-ready logging for monitoring
```

```
perf: optimize planet texture images

- Reduced textures from 3.5MB to 1.2MB (65% reduction)
- Used mozjpeg at 70% quality
- Visual quality maintained

Impact: ~3 second faster initial page load
```

---

## Final Notes

**Context for next session**: This optimization effort was triggered by astronomy-dashboard-dev agent code review. The agent identified:
- 46 files using console.log instead of logger
- Duplicate ErrorBoundary (152 lines waste)
- 4.3MB unoptimized images
- 15 components needing React.memo
- 12 TypeScript `any` types to fix

**Current status**: Only duplicate ErrorBoundary removed (5KB saved). Remaining work documented above.

**Next steps**: Start with image optimization (highest user impact), then logger migration (highest production value).
