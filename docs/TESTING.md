# Testing Guide for 3I/ATLAS Comet Dashboard

This document explains the testing infrastructure and best practices for the 3I/ATLAS comet tracking dashboard.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (interactive test runner)
npm run test:ui
```

## Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, modern test runner with Vite integration
- **React Testing**: [@testing-library/react](https://testing-library.com/react) - Component testing utilities
- **DOM Assertions**: [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) - Custom matchers for DOM testing
- **User Interactions**: [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) - User interaction simulation
- **Coverage**: V8 coverage provider for accurate code coverage metrics

## Project Structure

```
src/
├── __tests__/                    # Test infrastructure
│   ├── setup.ts                  # Global test setup and custom matchers
│   ├── test-utils.tsx            # Custom render functions and helpers
│   └── fixtures/                 # Test data fixtures
│       └── sample-observations.ts # Realistic astronomical test data
│
├── lib/
│   └── __tests__/
│       └── orbital-calculations.test.ts  # Orbital mechanics tests
│
├── services/
│   └── __tests__/
│       └── comet-brightness-models.test.ts  # Brightness model tests
│
├── utils/
│   └── __tests__/
│       └── activity-calculator.test.ts  # Activity calculation tests
│
└── lib/data-sources/
    └── __tests__/
        └── source-manager.test.ts  # Multi-source data fetching tests
```

## Test Coverage

Current test coverage focuses on critical astronomical calculations and data integrity:

### Coverage by Priority

**HIGHEST Priority - Orbital Calculations** (96.45% coverage)
- `/src/lib/orbital-calculations.ts`
- 21 tests covering:
  - Coordinate transformations (equatorial ↔ ecliptic)
  - Hyperbolic orbit position calculations (Kepler mechanics)
  - Numerical integration for trajectory projection
  - Backward integration for orbital trails
  - Edge cases (perihelion, discovery date limits)

**HIGH Priority - Activity Calculator** (21 tests)
- `/src/utils/activity-calculator.ts`
- Tests covering:
  - Activity level classification (LOW/MODERATE/HIGH/EXTREME)
  - Magnitude-based brightness calculations
  - Quality mappings (uncertainty → quality levels)
  - Edge cases (missing data, invalid values, boundary conditions)

**HIGH Priority - Brightness Models** (41 tests)
- `/src/services/comet-brightness-models.ts`
- Tests covering:
  - Heliocentric/geocentric distance calculations
  - Phase angle calculations
  - Magnitude predictions using standard comet formula
  - Parameter fitting with least squares regression
  - Trend analysis (brightening/dimming/stable detection)
  - R² calculations for fit quality
  - Edge cases (perihelion date, far distances)

**MEDIUM Priority - Source Manager** (80.08% coverage, 12 tests)
- `/src/lib/data-sources/source-manager.ts`
- Tests covering:
  - Multi-source parallel fetching (COBS, JPL, TheSkyLive)
  - Intelligent fallback strategies
  - Cache hit/miss scenarios with TTL
  - Data merging logic
  - Error handling for source failures

### Overall Coverage

- **Total Tests**: 95 tests across 4 test suites
- **All Tests Passing**: ✓
- **Critical Path Coverage**: Focused on astronomical calculations and data integrity
- **Tested Files Coverage**:
  - `orbital-calculations.ts`: 96.45%
  - `source-manager.ts`: 80.08%

## Writing Tests

### 1. Use Realistic Astronomical Data

Always test with realistic values, not random numbers:

```typescript
// ❌ BAD: Random numbers
const magnitude = 99.9;
const distance = -1.5;

// ✅ GOOD: Realistic comet observation ranges
const magnitude = 14.2; // Typical magnitude for 3I/ATLAS
const distance = 1.356; // Perihelion distance in AU
```

### 2. Test Edge Cases

Astronomical calculations have important edge cases:

```typescript
// Perihelion date (Oct 29, 2025)
it('should handle position at exact perihelion', () => {
  const position = calculatePositionFromElements(0, elements);
  const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  expect(distance).toBeCloseTo(PERIHELION_DISTANCE, 2);
});

// Discovery date limit (June 14, 2025)
it('should limit trail to discovery date', () => {
  const trail = calculateAtlasTrailFromOrbit(365, currentPos, currentVel);
  const discoveryDate = new Date('2025-06-14T00:00:00Z');

  for (const point of trail) {
    expect(new Date(point.date).getTime()).toBeGreaterThanOrEqual(discoveryDate.getTime());
  }
});
```

### 3. Use Descriptive Test Names

```typescript
// ❌ BAD
it('test1', () => { ... });

// ✅ GOOD
it('should calculate heliocentric distance correctly at perihelion', () => { ... });
```

### 4. Mock External Dependencies

When testing data fetching, mock the API calls:

```typescript
import { vi } from 'vitest';

vi.mock('../../../services/cobs-api', () => ({
  cobsApi: {
    getObservations: vi.fn(),
  },
}));

// In test:
vi.mocked(cobsApi.getObservations).mockResolvedValue(mockObservations);
```

### 5. Test One Behavior Per Test

Keep tests focused:

```typescript
// ✅ GOOD: Each test verifies one specific behavior
it('should return positive distance', () => {
  const dist = calculateHeliocentricDistance(date);
  expect(dist).toBeGreaterThan(0);
});

it('should increase distance after perihelion', () => {
  const dist10 = calculateHeliocentricDistance(tenDaysAfter);
  const dist30 = calculateHeliocentricDistance(thirtyDaysAfter);
  expect(dist30).toBeGreaterThan(dist10);
});
```

## Test Utilities and Fixtures

### Custom Test Utilities

Located in `/src/__tests__/test-utils.tsx`:

```typescript
import { render } from '@/__tests__/test-utils';

// Use custom render with providers if needed
const { getByText } = render(<MyComponent />);
```

### Test Fixtures

Located in `/src/__tests__/fixtures/sample-observations.ts`:

```typescript
import {
  SAMPLE_COBS_OBSERVATIONS,
  BRIGHTENING_OBSERVATIONS,
  DIMMING_OBSERVATIONS,
  PERIHELION_OBSERVATION,
  ATLAS_3I_ORBITAL_ELEMENTS,
} from '@/__tests__/fixtures/sample-observations';
```

Fixtures include:
- Sample COBS observations near perihelion
- Observations with brightening/dimming trends
- Edge case observations (perihelion, invalid data)
- 3I/ATLAS orbital parameters from MPEC 2025-SI6
- Sample JPL Horizons ephemeris data

## Running Specific Tests

```bash
# Run a specific test file
npx vitest run src/lib/__tests__/orbital-calculations.test.ts

# Run tests matching a pattern
npx vitest run -t "orbital"

# Run in watch mode for specific file
npx vitest watch src/lib/__tests__/orbital-calculations.test.ts
```

## Debugging Tests

### Console Logs

```typescript
// Console logs are visible during test runs
console.log('Debug value:', someVariable);
```

### VSCode Debugging

Add breakpoints in your IDE and run:

```bash
node --inspect-brk ./node_modules/.bin/vitest run
```

### Vitest UI

The interactive UI is helpful for debugging:

```bash
npm run test:ui
```

This opens a browser interface where you can:
- See test output in real-time
- Filter and search tests
- View coverage visually
- Debug individual tests

## Coverage Reports

After running `npm run test:coverage`, reports are generated in:

- `/coverage/index.html` - HTML coverage report (open in browser)
- `/coverage/lcov.info` - LCOV format for CI integration
- Console output - Summary table

### Coverage Goals

Current aspirational thresholds (configured in `vitest.config.ts`):
- Lines: 60%
- Functions: 60%
- Branches: 50%
- Statements: 60%

**Note**: These are not enforced. Focus is on critical path coverage (astronomical calculations) rather than blanket coverage.

## Best Practices for This Project

### 1. Astronomical Precision

This is production code tracking real astronomical events. Test with precision:

```typescript
// Use toBeCloseTo for floating-point comparisons
expect(distance).toBeCloseTo(1.356320, 5); // 5 decimal places

// Validate astronomical calculations against known values
const expectedMagnitude = H + 5 * Math.log10(delta) + n * Math.log10(r);
expect(calculatedMagnitude).toBeCloseTo(expectedMagnitude, 2);
```

### 2. UTC Timestamps

All dates in tests should use UTC:

```typescript
const perihelionDate = new Date('2025-10-29T11:35:31Z'); // Note the 'Z'
```

Process is configured with `TZ=UTC` in test setup.

### 3. Test Data Quality

Use data from actual mission parameters:
- Perihelion: October 29, 2025, 11:35:31 UTC
- Discovery: June 14, 2025
- Perihelion distance: 1.356320 AU
- Eccentricity: 6.138559 (hyperbolic)
- Magnitude range: 11-19

### 4. Error Handling

Test both success and failure paths:

```typescript
it('should handle COBS API failure gracefully', async () => {
  vi.mocked(cobsApi.getObservations).mockRejectedValue(new Error('API error'));

  const result = await manager.getCometData();

  // Should still return data with fallbacks
  expect(result).toBeDefined();
});
```

### 5. Performance Considerations

Some tests involve numerical integration which can be slow. Use reasonable limits:

```typescript
// ✅ GOOD: Test with manageable data sizes
const projection = calculateAtlasProjectionFromStateVectors(10, startDate, position, velocity);

// ❌ BAD: Overly large test data
const projection = calculateAtlasProjectionFromStateVectors(10000, ...); // Too slow
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation/updates
- Commits to main branch

Configuration:
```bash
# In CI environment
npm ci
npm test
npm run test:coverage

# Coverage reports can be uploaded to services like Codecov
```

## Troubleshooting

### Tests Timing Out

Increase timeout in test file:

```typescript
it('slow test', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

Or globally in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 10000,
}
```

### Module Resolution Errors

Ensure path aliases work:
- Check `vitest.config.ts` has correct `resolve.alias` configuration
- Verify `@/*` maps to `./src/*`

### Mock Issues

If mocks aren't working:
1. Ensure `vi.mock()` is called before imports
2. Use `vi.mocked()` for TypeScript type safety
3. Clear mocks in `beforeEach()`: `vi.clearAllMocks()`

### Tests Pass Locally but Fail in CI

Common causes:
- Timezone differences (we use UTC)
- Date.now() dependencies (mock Date if needed)
- File system case sensitivity
- Missing environment variables

## Adding New Tests

When adding new functionality:

1. **Create test file** alongside the source file:
   ```
   src/lib/new-feature.ts
   src/lib/__tests__/new-feature.test.ts
   ```

2. **Follow naming conventions**:
   - Test files: `*.test.ts` or `*.test.tsx`
   - Describe blocks: Match function/class names
   - Test names: "should [expected behavior]"

3. **Start with edge cases** for astronomical code:
   - Perihelion date
   - Discovery date
   - Very close/far distances
   - Invalid/missing data

4. **Add fixtures if needed**:
   - Place in `/src/__tests__/fixtures/`
   - Use realistic astronomical data
   - Export as named constants

5. **Run tests before committing**:
   ```bash
   npm test
   npm run test:coverage
   ```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [3I/ATLAS MPEC 2025-SI6](https://minorplanetcenter.net/) - Orbital parameters source
- [COBS Database](https://cobs.si/) - Observation data source

## Questions?

For questions about:
- **Test infrastructure**: Check this document and `vitest.config.ts`
- **Astronomical calculations**: See comments in test files and source files
- **Test fixtures**: Review `/src/__tests__/fixtures/sample-observations.ts`
- **Mock data**: Check individual test files for mock setup examples
