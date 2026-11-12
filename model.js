/**
 * Three Tank Control Lab — engineering source of truth.
 * Units: m, m², m³/min, min; internal states are level deviations in m.
 * Fresh implementation of the model derived in docs/MODEL.md.
 */
export const DEFAULTS = Object.freeze({area: 1, level: 1, flow: 0.2, gain: 0.2, setpoint: 0.2, disturbance: 0, duration: 120, disturbanceTime: 30});
const REQUIRED = Object.keys(DEFAULTS);
const MAX_STEPS = 250000;
const STABILITY_TOL = 1e-10;
const OUTPUT_INTERVALS = 1600;
const sameTime = (a, b) => Math.abs(a - b) <= 8 * Number.EPSILON * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE);

export function derive(c) {
  const R = 2 * c.level / c.flow;
  const tau = c.area * R;
  const loopGain = c.gain * R;
  const rho = Math.cbrt(loopGain);
  const re = (-1 + rho / 2) / tau;
  const im = Math.sqrt(3) * rho / (2 * tau);
  const stability = Math.abs(loopGain - 8) <= STABILITY_TOL ? 'marginal' : loopGain < 8 ? 'stable' : 'unstable';
  return {R, tau, loopGain, criticalGain: 8 / R, period: 2 * Math.PI * tau / Math.sqrt(3), stability,
    poles: [{re: (-1 - rho) / tau, im: 0}, {re: stability === 'marginal' ? 0 : re, im}, {re: stability === 'marginal' ? 0 : re, im: -im}],
    numerator: loopGain, denominator: [tau ** 3, 3 * tau ** 2, 3 * tau, 1 + loopGain]};
}

export function validateCase(c) {
  const errors = [], warnings = [];
  const add = (field, message) => errors.push({field, message});
  for (const field of REQUIRED) if (typeof c[field] !== 'number' || !Number.isFinite(c[field])) add(field, 'Enter a finite number; blank fields, infinity, and text are not valid.');
  if (errors.length) return {valid: false, errors, warnings};
  for (const field of ['area', 'level', 'flow', 'duration']) if (c[field] <= 0) add(field, `${field === 'level' ? 'Steady level' : field[0].toUpperCase() + field.slice(1)} must be greater than zero. Enter a positive value.`);
  if (c.gain < 0) add('gain', 'This negative-feedback lesson uses Kc ≥ 0. Enter zero or a positive gain.');
  if (!Number.isFinite(c.level + c.setpoint)) add('setpoint', 'Steady level + setpoint step exceeds the finite numeric range. Reduce their magnitude.');
  else if (c.level + c.setpoint <= 0) add('setpoint', 'The requested absolute level must be positive: steady level + step > 0. Use a smaller downward step.');
  if (!Number.isFinite(c.flow + c.disturbance)) add('disturbance', 'Steady flow + disturbance exceeds the finite numeric range. Reduce the disturbance.');
  if (c.disturbanceTime < 0) add('disturbanceTime', 'Disturbance time must be zero or later.');
  if (!errors.length) {
    const d = derive(c);
    const cost = c.duration * (1 + Math.cbrt(d.loopGain)) / (0.04 * d.tau);
    if (![d.R, d.tau, d.loopGain, ...d.denominator, ...d.poles.flatMap(p => [p.re, p.im])].every(Number.isFinite) || d.tau <= 0 || d.R <= 0 || d.denominator.some(v => v <= 0)) add('area', 'These values exceed the finite range of the solver. Use moderate positive tank conditions.');
    if (![c.gain * c.setpoint, d.R * c.disturbance, d.loopGain * c.setpoint, c.flow + c.gain * c.setpoint + c.disturbance, c.level * 1e6].every(Number.isFinite)) add('setpoint', 'The implied controller flow or level scale exceeds the numeric range. Reduce the input magnitudes.');
    if (d.loopGain > 1000) add('gain', 'The teaching solver allows KcR ≤ 1000. Reduce Kc; KcR = 9 already demonstrates instability.');
    if (!Number.isFinite(cost) || cost > MAX_STEPS) add('duration', 'This run needs too many integration steps (limit 250,000). Shorten the duration, reduce gain, or increase the tank time constant.');
    if (c.disturbance && c.disturbanceTime > c.duration) warnings.push('The inlet disturbance occurs after this run ends; extend the duration to see it.');
    if (Math.abs(c.setpoint) > 0.2 * c.level) warnings.push('The setpoint step exceeds 20% of steady level. This built-in teaching rule flags a possible departure from the local linear model; it is not a universal accuracy limit.');
    if (Math.abs(c.disturbance) > 0.2 * c.flow) warnings.push('The disturbance exceeds 20% of steady flow. Large excursions can make the linearized gravity-drain approximation inaccurate.');
    if (d.stability !== 'stable') warnings.push(`${d.stability === 'marginal' ? 'Marginal' : 'Unstable'} learning example: steady-state, overshoot, and settling metrics are withheld because the system does not asymptotically settle.`);
  }
  return {valid: errors.length === 0, errors, warnings};
}

export function presets(c) {
  const R = 2 * c.level / c.flow;
  return [
    ['none', 'No control', 0], ['stable', 'Stable', 2], ['near', 'Near the limit', 7.2],
    ['marginal', 'Marginal boundary', 8], ['unstable', 'Unstable', 9]
  ].map(([id, label, loopGain]) => ({id, label, gain: loopGain / R, loopGain}));
}

/** Derivatives of deviation levels; disturbance is a flow deviation, held constant during an RK4 step. */
export function rhs(c, d, x, disturbance = 0) {
  const u = c.gain * (c.setpoint - x[2]);
  return [(d.R * (u + disturbance) - x[0]) / d.tau, (x[0] - x[1]) / d.tau, (x[1] - x[2]) / d.tau];
}

function rk4(c, d, x, step, disturbance) {
  const k1 = rhs(c, d, x, disturbance);
  const k2 = rhs(c, d, x.map((v, i) => v + step * k1[i] / 2), disturbance);
  const k3 = rhs(c, d, x.map((v, i) => v + step * k2[i] / 2), disturbance);
  const k4 = rhs(c, d, x.map((v, i) => v + step * k3[i]), disturbance);
  return x.map((v, i) => v + step * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
}

/** Conservative bound on all future Tank 3 errors, after the final input event. */
function futureTailBound(c, d, xAtEvent, steady, elapsed) {
  const z = xAtEvent.map(v => v - steady);
  const theta = elapsed / d.tau;
  const y = z[2], v = z[1] - z[2], a = z[0] - 2 * z[1] + z[2];
  if (d.loopGain === 0) {
    const terms = [Math.abs(y), Math.abs(v + y), Math.abs(a + 2 * v + y) / 2];
    return terms.reduce((sum, coeff, n) => {const t = Math.max(theta, n); return sum + coeff * t ** n * Math.exp(-t);}, 0);
  }
  // For nearly repeated poles, a comparison-system bound avoids cancellation
  // between huge modal coefficients. B = -I + |couplings|; B w <= -(1-e)w.
  if (d.loopGain < 0.001) {
    return Math.min(...[0.12, 0.2, 0.3, 0.5, 0.7].filter(e => e ** 3 > d.loopGain).map(e => Math.max(Math.abs(z[0]) / e ** 2, Math.abs(z[1]) / e, Math.abs(z[2])) * Math.exp((-1 + e) * theta)));
  }
  const rho = Math.cbrt(d.loopGain), real = -1 - rho, alpha = -1 + rho / 2, beta = Math.sqrt(3) * rho / 2;
  const A = (a - 2 * alpha * v + (alpha * alpha + beta * beta) * y) / ((real - alpha) ** 2 + beta ** 2);
  const B = y - A, C = (v - real * A - alpha * B) / beta;
  return Math.abs(A) * Math.exp(real * theta) + Math.hypot(B, C) * Math.exp(alpha * theta);
}

export function simulate(input) {
  const c = {...input};
  const validation = validateCase(c);
  if (!validation.valid) {const err = new Error(validation.errors.map(e => `${e.field}: ${e.message}`).join('\n')); err.errors = validation.errors; throw err;}
  const d = derive(c), warnings = [...validation.warnings], points = [];
  const maxStep = 0.04 * d.tau / (1 + Math.cbrt(d.loopGain));
  const outputStep = c.duration / OUTPUT_INTERVALS;
  const hasEvent = c.disturbance !== 0 && c.disturbanceTime <= c.duration;
  const finalEvent = hasEvent ? c.disturbanceTime : 0;
  let eventState = [0, 0, 0], x = [0, 0, 0], time = 0, steps = 0, truncated = false;
  const steady = (d.loopGain * c.setpoint + d.R * (hasEvent ? c.disturbance : 0)) / (1 + d.loopGain);
  const band = 0.02 * Math.abs(steady);
  let maxProgress = 0, settlingCandidate = null, crossedSetpoint = false;
  const direction = Math.sign(c.setpoint);
  let maxRelativeLevel = 0, negativeLevel = false, negativeInflow = false;
  const track = () => {
    maxRelativeLevel = Math.max(maxRelativeLevel, ...x.map(v => Math.abs(v) / c.level));
    negativeLevel ||= x.some(v => c.level + v < 0);
    const activeD = hasEvent && (time >= c.disturbanceTime || sameTime(time, c.disturbanceTime)) ? c.disturbance : 0;
    negativeInflow ||= c.flow + c.gain * (c.setpoint - x[2]) + activeD < 0;
    crossedSetpoint ||= direction !== 0 && direction * (x[2] - c.setpoint) > 1e-9 * Math.max(c.level, Math.abs(c.setpoint));
    if (steady !== 0) maxProgress = Math.max(maxProgress, x[2] / steady);
    if (time < finalEvent || Math.abs(x[2] - steady) > band) settlingCandidate = null;
    else if (settlingCandidate === null) settlingCandidate = time;
  };
  const sample = (overrideDisturbance) => {
    const disturbance = overrideDisturbance ?? ( hasEvent && (time >= c.disturbanceTime || sameTime(time, c.disturbanceTime)) ? c.disturbance : 0);
    const u = c.gain * (c.setpoint - x[2]);
    const p = {t: time, h1: c.level + x[0], h2: c.level + x[1], h3: c.level + x[2], u, inflow: c.flow + u + disturbance, sp: c.level + c.setpoint, d: disturbance, q1: c.flow + x[0] / d.R, q2: c.flow + x[1] / d.R, q3: c.flow + x[2] / d.R};
    if (!Object.values(p).every(Number.isFinite)) { truncated = true; return; }
    const previous = points.at(-1);
    if (!previous || previous.t !== p.t || previous.d !== p.d) points.push(p);
  };
  track();
  if (hasEvent && c.disturbanceTime === 0) sample(0);
  sample();
  for (let index = 1; index <= OUTPUT_INTERVALS; index++) {
    const target = index === OUTPUT_INTERVALS ? c.duration : index * outputStep;
    while (time < target && !sameTime(time, target)) {
      const beforeEvent = hasEvent && time < c.disturbanceTime && !sameTime(time, c.disturbanceTime);
      const stop = beforeEvent ? Math.min(target, c.disturbanceTime) : target;
      const step = Math.min(maxStep, stop - time);
      if (step <= 0) break;
      x = rk4(c, d, x, step, beforeEvent ? 0 : hasEvent ? c.disturbance : 0);
      time += step;
      if (beforeEvent && sameTime(time, c.disturbanceTime)) {time = c.disturbanceTime; eventState = [...x]; sample(0); sample(c.disturbance);}
      steps++;
      if (truncated || steps > MAX_STEPS + OUTPUT_INTERVALS || x.some(v => !Number.isFinite(v) || Math.abs(v) > 1e6 * c.level)) {truncated = true; break;}
      track();
    }
    if (!truncated) time = target;
    if (x.every(Number.isFinite)) sample();
    if (truncated) break;
  }
  if (maxRelativeLevel > 0.2) warnings.push('At least one tank moves more than 20% from its steady level. This built-in caution threshold flags local-linearization limits; the equations still run without physical clipping.');
  if (negativeLevel) warnings.push('The linear model predicts a negative absolute liquid level, which is physically impossible. Interpret this as model breakdown, not an achievable tank motion.');
  if (negativeInflow) warnings.push('The ideal controller predicts negative total inlet flow. A real pump cannot usually do this; actuator limits are intentionally absent from this linear lesson.');
  if (truncated) warnings.push('The run stopped at a numerical display limit (state magnitude, finite arithmetic, or work budget). Reduce the input magnitude, gain, or duration. This guard alone does not establish instability; inspect the poles.');
  const metrics = {steadyChange: null, steadyLevel: null, offset: null, overshootPct: null, settlingTime: null, crossesSetpoint: false};
  metrics.crossesSetpoint = crossedSetpoint;
  if (d.stability === 'stable' && !truncated) {
    metrics.steadyChange = steady;
    metrics.steadyLevel = c.level + steady;
    metrics.offset = c.setpoint - steady;
    const zeroTrajectory = c.gain * c.setpoint === 0 && (!hasEvent || c.disturbance === 0);
    if (zeroTrajectory) metrics.settlingTime = 0;
    else if (Math.abs(steady) > 1e-12 * Math.max(c.level, Math.abs(c.setpoint))) {
      const tail = futureTailBound(c, d, eventState, steady, c.duration - finalEvent);
      if (tail <= band) {
        if (settlingCandidate !== null) metrics.settlingTime = settlingCandidate - finalEvent;
        metrics.overshootPct = Math.max(0, maxProgress - 1) * 100;
      } else warnings.push('This window does not establish settling within 2% of the predicted final change. Extend the duration; settling time and overshoot are withheld.');
    } else warnings.push('The net final level change is zero, so percentage overshoot and relative 2% settling time are undefined. Inspect the transient directly.');
    if (hasEvent && c.disturbanceTime > 0 && c.gain * c.setpoint !== 0) warnings.push('With two input events, reported overshoot describes the entire run relative to the final level change; settling time is measured after the disturbance. Use one input at a time for standard step-response comparisons.');
  }
  return {case: c, derived: d, points, metrics, warnings: [...new Set(warnings)], truncated};
}
