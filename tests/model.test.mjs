import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS, derive, validateCase, presets, rhs, simulate} from '../model.js';
const base = change => ({...DEFAULTS, ...change});
const near = (actual, expected, tol = 2e-7) => assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${actual} differs from ${expected}`);

// Independent modal solution of y''' + 3y'' + 3y' + (1+L)y = b,
// with dimensionless time and zero initial conditions. No numerical integration.
function analyticalStep(c, t, amplitude) {
  if (t <= 0 || amplitude === 0) return [0, 0, 0];
  const R = 2 * c.level / c.flow, tau = c.area * R, L = c.gain * R, theta = t / tau;
  if (L === 0) return [amplitude * (1 - Math.exp(-theta)), amplitude * (1 - Math.exp(-theta) * (1 + theta)), amplitude * (1 - Math.exp(-theta) * (1 + theta + theta * theta / 2))];
  const rho = Math.cbrt(L), p = -1 - rho, a = -1 + rho / 2, b = Math.sqrt(3) * rho / 2;
  const steady = amplitude / (1 + L);
  const A = -(a * a + b * b) * steady / (3 * rho * rho), B = -steady - A, C = (-p * A - a * B) / b;
  const cos = Math.cos(b * theta), sin = Math.sin(b * theta), er = Math.exp(p * theta), ec = Math.exp(a * theta);
  const y = steady + A * er + ec * (B * cos + C * sin);
  const dy = p * A * er + ec * ((a * B + b * C) * cos + (a * C - b * B) * sin);
  const ddy = p * p * A * er + ec * (((a * a - b * b) * B + 2 * a * b * C) * cos + ((a * a - b * b) * C - 2 * a * b * B) * sin);
  return [y + 2 * dy + ddy, y + dy, y];
}
function analytical(c, t) {
  const R = 2 * c.level / c.flow, L = c.gain * R;
  const sp = analyticalStep(c, t, L * c.setpoint);
  const dis = analyticalStep(c, t - c.disturbanceTime, R * c.disturbance);
  return sp.map((v, i) => c.level + v + dis[i]);
}
function compareSolution(c, tolerance = 2e-7) {
  const result = simulate(c);
  for (let i = 0; i < result.points.length; i += 37) {
    const p = result.points[i], answer = analytical(c, p.t);
    ['h1','h2','h3'].forEach((key, j) => near(p[key], answer[j], tolerance));
  }
  return result;
}

test('Kyle default: resistance, time constant, cubic coefficients, equilibrium', () => {
  const d = derive(DEFAULTS); near(d.R, 10); near(d.tau, 10); near(d.loopGain, 2); near(d.criticalGain, .8);
  assert.deepEqual(d.denominator, [1000, 300, 30, 3]); assert.equal(d.numerator, 2);
  const run = compareSolution(DEFAULTS); near(run.metrics.steadyChange, 2 / 15); near(run.metrics.steadyLevel, 17 / 15); near(run.metrics.offset, 1 / 15);
  assert.ok(run.metrics.settlingTime > 0); assert.ok(run.metrics.overshootPct > 0);
});
test('transfer function: independently evaluate all three poles in the cubic', () => {
  const c = base({area:2.1,level:1.3,flow:.4,gain:.7}), d = derive(c);
  for (const p of d.poles) {
    const a = 1 + d.tau * p.re, b = d.tau * p.im;
    near(a ** 3 - 3 * a * b * b + d.loopGain, 0, 1e-10); near(3 * a * a * b - b ** 3, 0, 1e-10);
  }
});
test('all analytical trajectories: setpoint-only stable', () => compareSolution(base({gain:.35,duration:250})));
test('all analytical trajectories: disturbance-only and exact delayed event', () => compareSolution(base({setpoint:0,disturbance:.025,disturbanceTime:17.1234,duration:210})));
test('combined delayed inputs obey superposition', () => compareSolution(base({setpoint:.1,disturbance:-.012,disturbanceTime:23.451,duration:200})));
test('negative setpoint has same percentage overshoot as positive step', () => {
  const positive = compareSolution(base({duration:200})), negative = compareSolution(base({setpoint:-.2,duration:200}));
  near(positive.metrics.overshootPct, negative.metrics.overshootPct); near(positive.metrics.settlingTime, negative.metrics.settlingTime);
});
test('zero gain ignores setpoint and has zero controller output', () => {
  const r = simulate(base({gain:0})); assert.ok(r.points.every(p => p.h1===1 && p.h2===1 && p.h3===1 && p.u===0));
  assert.equal(r.metrics.overshootPct,null); assert.equal(r.metrics.settlingTime,0); near(r.metrics.offset,.2);
});
test('zero gain disturbance agrees with the three repeated-pole formulas', () => compareSolution(base({gain:0,setpoint:0,disturbance:.02,disturbanceTime:0,duration:150})));
test('zero forcing stays exactly at equilibrium even for unstable poles', () => {
  const r = simulate(base({setpoint:0,disturbance:0,gain:.9}));
  assert.equal(r.derived.stability,'unstable'); assert.ok(r.points.every(p => p.h3 === 1)); assert.equal(r.metrics.steadyLevel,null);
});
test('just below, at, just above L=8 are classified correctly', () => {
  for (const [L,status] of [[7.999999,'stable'],[8,'marginal'],[8.000001,'unstable']]) {
    const r = compareSolution(base({gain:L/10,duration:100})); assert.equal(r.derived.stability,status);
    if (status !== 'stable') for (const key of ['steadyChange','steadyLevel','offset','overshootPct','settlingTime']) assert.equal(r.metrics[key],null);
  }
});
test('marginal poles and oscillation period are exact', () => {
  const d = derive(base({gain:.8})); near(d.poles[0].re,-.3); near(d.poles[1].re,0); near(d.poles[1].im,Math.sqrt(3)/10); near(d.period,20*Math.PI/Math.sqrt(3));
});
test('unstable response agrees with modal result before numerical guard', () => compareSolution(base({gain:.9,duration:300}),1e-6));
test('presets preserve loop gains when R changes', () => {
  const c=base({level:2,flow:.1}), p=presets(c); assert.deepEqual(p.map(v=>v.loopGain),[0,2,7.2,8,9]);
  p.forEach(v=>near(derive({...c,gain:v.gain}).loopGain,v.loopGain));
});
test('reject nonfinite, missing, negative and zero physical inputs with field-specific repairs', () => {
  for (const change of [{area:0},{level:-1},{flow:0},{gain:-.1},{duration:0},{disturbanceTime:-1},{setpoint:-1},{area:Infinity},{gain:NaN},{gain:''}]) {
    const v=validateCase(base(change)); assert.equal(v.valid,false); assert.ok(v.errors[0].field && v.errors[0].message.length>15); assert.throws(()=>simulate(base(change)));
  }
});
test('reject excessive solver work before integration', () => assert.equal(validateCase(base({area:1e-10})).valid,false));
test('short runs report predicted equilibrium but no observed settling or overshoot', () => {
  const r=simulate(base({duration:.1})); assert.equal(r.metrics.settlingTime,null); assert.equal(r.metrics.overshootPct,null); near(r.metrics.steadyChange,2/15); near(r.points.at(-1).t,.1);
});
test('near-boundary slow decay cannot be falsely reported as settled', () => {
  const r=simulate(base({gain:.7999,duration:120})); assert.equal(r.metrics.settlingTime,null); assert.equal(r.metrics.overshootPct,null);
});
test('disturbance beyond run is identified and not applied', () => {
  const r=simulate(base({setpoint:0,disturbance:.01,disturbanceTime:200})); assert.ok(r.points.every(p=>p.h3===1&&p.d===0)); assert.ok(r.warnings.some(s=>s.includes('after this run ends')));
});
test('controller and inlet fields satisfy ideal controller law at every point', () => {
  const c=base({disturbance:.015}); const r=simulate(c);
  r.points.forEach(p=>{near(p.u,c.gain*(p.sp-p.h3),1e-12); near(p.inflow,c.flow+p.u+p.d,1e-12); [1,2,3].forEach(i=>near(p['q'+i],c.flow+(p['h'+i]-c.level)/r.derived.R,1e-12)); if(p.t!==30) assert.equal(p.d,p.t>30?.015:0);});
});
test('RHS conserves all three tank balances', () => {
  const c=base({area:1.2}), d=derive(c), x=[.1,.07,.03], dis=.01, f=rhs(c,d,x,dis), u=c.gain*(c.setpoint-x[2]);
  near(c.area*f[0],u+dis-x[0]/d.R); near(c.area*f[1],(x[0]-x[1])/d.R); near(c.area*f[2],(x[1]-x[2])/d.R);
});
test('zero final change with opposing delayed inputs leaves percentage metrics undefined', () => {
  const r=simulate(base({disturbance:-.04,duration:250})); near(r.metrics.steadyChange,0); assert.equal(r.metrics.overshootPct,null); assert.equal(r.metrics.settlingTime,null); assert.ok(r.points.some(p=>Math.abs(p.h3-1)>.01));
});
test('simulation is deterministic and does not mutate input (reset/comparison contract)', () => {
  const c=Object.freeze(base()); const a=simulate(c), b=simulate(c); assert.deepEqual(a,b); assert.deepEqual(c,DEFAULTS);
});
test('overshoot relative to final response differs from setpoint crossing', () => {
  const r=simulate(base({gain:.1,duration:250})); assert.ok(r.metrics.overshootPct>0); assert.equal(r.metrics.crossesSetpoint,false);
});
test('physically impossible predictions warn without silently clipping values', () => {
  const r=simulate(base({gain:.9,setpoint:.4,duration:500})); assert.ok(r.warnings.some(s=>s.includes('negative'))); assert.ok(r.points.some(p=>p.inflow<0));
});
test('instability guard returns finite data and clearly marks truncation', () => {
  const r=simulate(base({gain:2,duration:1500})); assert.equal(r.truncated,true); assert.ok(r.points.every(p=>Number.isFinite(p.h3))); assert.equal(r.metrics.settlingTime,null);
});

test('extreme finite inputs cannot overflow sums, forcing, or polynomial coefficients', () => {
  for (const change of [{level:1e308,setpoint:1e308},{flow:1e308,disturbance:1e308},{disturbance:1e308},{setpoint:1e308},{area:1e-200,duration:1e-200},{area:1e200}]) {
    assert.equal(validateCase(base(change)).valid,false,JSON.stringify(change));
  }
});
test('very small valid time scales preserve dimensionless dynamics and delayed event timing', () => {
  const c=base({area:1e-12,duration:120e-12,disturbance:.02,disturbanceTime:30e-12});
  const run=compareSolution(c,2e-7); near(run.points.at(-1).t,c.duration,1e-20);
  assert.ok(run.points.find(p=>p.t>31e-12).d>.0);
});

test('long graph windows retain transient overshoot and settling accuracy', () => {
  const normal=simulate(base()), long=simulate(base({duration:40000}));
  near(long.metrics.overshootPct,normal.metrics.overshootPct,.0001);
  assert.ok(Math.abs(long.metrics.settlingTime-normal.metrics.settlingTime)<.3);
  assert.equal(long.metrics.crossesSetpoint,normal.metrics.crossesSetpoint);
});
test('nearly zero gain does not lose settling from repeated-pole cancellation', () => {
  const zero=simulate(base({gain:0,setpoint:0,disturbance:.02,disturbanceTime:0}));
  const tiny=simulate(base({gain:1e-10,setpoint:0,disturbance:.02,disturbanceTime:0}));
  assert.ok(tiny.metrics.settlingTime !== null); near(tiny.metrics.settlingTime,zero.metrics.settlingTime,1e-5);
});
test('disturbance is sampled on both sides of its exact jump without a plotted ramp', () => {
  const c=base({disturbance:.023,disturbanceTime:17.1234}), r=simulate(c), at=r.points.filter(p=>p.t===c.disturbanceTime);
  assert.equal(at.length,2); assert.equal(at[0].d,0); assert.equal(at[1].d,c.disturbance);
  for(const key of ['h1','h2','h3','u']) assert.equal(at[0][key],at[1][key]);
  near(at[1].inflow-at[0].inflow,c.disturbance,1e-12);
  assert.ok(r.points.every((p,i)=>i===0||p.t>=r.points[i-1].t));
});
test('stable display guard does not label a large finite input as an instability', () => {
  const r=simulate(base({setpoint:1e20})); assert.equal(r.truncated,true); assert.equal(r.derived.stability,'stable');
  assert.ok(r.warnings.some(w=>w.includes('does not establish instability')));
  assert.ok(r.points.every(p=>Object.values(p).every(Number.isFinite)));
});
