import { checkRunningCriteria, WeatherCondition } from '../services/weather';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [Assertion Failed] ${message}`);
    process.exit(1);
  }
}

function runWeatherTests() {
  console.log('[Test] Running weather-logic.test.ts...');

  // Returns a base valid condition meeting all criteria
  const createBaseValid = (): WeatherCondition => ({
    temp: 20,
    hasRain: false,
    pop: 0.1,
    description: 'clear sky',
    dateTime: new Date()
  });

  // 1. Temperature Boundaries (Limit: Temp < 25°C)
  console.log('[Test] Verifying temperature boundary conditions...');
  
  const c1 = createBaseValid();
  c1.temp = 24.9;
  assert(checkRunningCriteria(c1) === true, '24.9°C temp should meet criteria.');

  const c2 = createBaseValid();
  c2.temp = 25.0;
  assert(checkRunningCriteria(c2) === false, '25.0°C temp should fail running criteria (must be strictly < 25).');

  const c3 = createBaseValid();
  c3.temp = 25.1;
  assert(checkRunningCriteria(c3) === false, '25.1°C temp should fail running criteria.');

  // 2. Precipitation Probability Boundaries (Limit: PoP < 30% / 0.3)
  console.log('[Test] Verifying precipitation probability (PoP) boundary conditions...');

  const p1 = createBaseValid();
  p1.pop = 0.29;
  assert(checkRunningCriteria(p1) === true, '29% PoP should meet criteria.');

  const p2 = createBaseValid();
  p2.pop = 0.30;
  assert(checkRunningCriteria(p2) === false, '30% PoP should fail running criteria (must be strictly < 30%).');

  const p3 = createBaseValid();
  p3.pop = 0.31;
  assert(checkRunningCriteria(p3) === false, '31% PoP should fail running criteria.');

  // 3. Rain / Weather Conditions
  console.log('[Test] Verifying rain keyword matches...');

  const r1 = createBaseValid();
  r1.hasRain = false;
  assert(checkRunningCriteria(r1) === true, 'Condition with no rain should meet criteria.');

  const r2 = createBaseValid();
  r2.hasRain = true;
  assert(checkRunningCriteria(r2) === false, 'Condition with rain should fail criteria.');

  console.log('✅ [Test Success] weather-logic.test.ts completed. All deterministic boundary checks passed.');
}

runWeatherTests();
