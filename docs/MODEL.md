# Engineering model and independent verification

This is a fresh mathematical implementation of the identical, noninteracting, gravity-drained tank model identified in Kyle Conner's project. The equations below were independently derived; no original project source or assets are included. Tank heights in charts are absolute levels. Transfer functions, state equations, controller output, and disturbance use deviations from a steady operating point.

## Assumptions and units

- Three identical tanks have constant cross-sectional area A [m²], steady level h̄ [m], and steady volumetric flow q̄ [m³/min]. Density is constant.
- Each outlet drains freely into the next tank, so its flow depends on its own liquid head, not the downstream level. This is the meaning of **noninteracting**. Submerged connections between tanks would require another model.
- Gravity drainage follows q = c√h. The chosen operating point determines c = q̄/√h̄; changing h̄ or q̄ therefore changes this implied drain coefficient.
- First-order linearization is local to that operating point. All initial deviation levels are zero.
- The controller and level sensor act instantly, with ideal negative unity feedback. There is no time delay, noise, pump saturation, integral action, overflow, empty-tank clamp, or nonlinear flow correction.
- Kc has units (m³/min)/m = m²/min; R has units m/(m³/min) = min/m². Their product L = KcR is dimensionless. τ = AR has units min.

## Derivation

Start with conservation of liquid volume:

`A dh_i/dt = q_(i−1) − q_i`, where `q_i = c√h_i`.

At steady state every flow equals q̄. Taylor-expand the drain law near h̄:

`δq_i ≈ (q̄/(2h̄)) δh_i = δh_i/R`, so `R = 2h̄/q̄`, `τ = AR`.

Taking the Laplace transform with zero initial deviations gives:

`H_i/Q_(i−1) = R/(τs+1)` and `Q_i/Q_(i−1) = 1/(τs+1)`.

Multiplying two flow-to-flow blocks and the final flow-to-level block gives:

`Gp(s) = H3/Qin = [1/(τs+1)]² [R/(τs+1)] = R/(τs+1)³`.

It is **R**, not R³: the outlet flow-to-level conversion cancels intermediate resistance factors. Equivalently, `H2/H1 = H3/H2 = 1/(τs+1)`.

Let r be the setpoint level deviation, u the controller flow deviation, and d an external inlet-flow disturbance added after the controller. Then `u = Kc(r − h3)` and `h3 = Gp[u+d]`. Rearranging:

`H3/SP = KcR / [(τs+1)³ + KcR]`

`H3/D = R / [(τs+1)³ + KcR]`.

The simulator integrates exactly the corresponding three first-order balances:

```
dh1/dt = [R(Kc(r − h3) + d) − h1] / τ
dh2/dt = (h1 − h2) / τ
dh3/dt = (h2 − h3) / τ
```

Absolute inlet flow is `q̄ + u + d`; absolute tank levels are `h̄ + h_i`. The setpoint step occurs at t = 0. The disturbance is a persistent inlet-flow step at its chosen time. The integration step is split at that event, so the discontinuity is never averaged across an RK4 substep. The plotted data include two samples at the exact event time: the pre-step and post-step inlet flow, with continuous tank levels.

## Stability and gain

Expanding the characteristic polynomial gives:

`τ³s³ + 3τ²s² + 3τs + (1+L) = 0`, with `L = KcR`.

For L ≥ 0, let ρ = ∛L. The three poles are:

```
p1   = (−1 − ρ)/τ
p2,3 = (−1 + ρ/2 ± j√3ρ/2)/τ
```

The pair's real part reaches zero at ρ = 2, hence **L = 8**. Therefore:

- `0 ≤ L < 8`: asymptotically stable.
- `L = 8`: marginal, with poles `−3/τ` and `±j√3/τ`; sustained free oscillations have period `2πτ/√3`.
- `L > 8`: unstable; the oscillatory pair grows exponentially.

The Routh first column is `τ³, 3τ², τ(8−L)/3, 1+L`, confirming the same result. “Marginal” describes nondecaying free oscillations; this boundary is not bounded-input bounded-output stable, since a resonant input can drive unbounded growth. The critical controller gain is `Kc,crit = 8/R`; there is no universal critical Kc independent of tank conditions. The implementation treats a difference from 8 of at most 10⁻¹⁰ as the displayed marginal boundary, a floating-point classification tolerance.

Presets use L = 0, 2, 7.2, 8, and 9, then calculate Kc = L/R. They remain meaningful when A, h̄, or q̄ change. A affects speed through τ; R also affects loop gain when Kc is held fixed.

A perfectly zero initial state with zero excitation stays zero even when the poles are unstable. A flat zero-input graph does not establish internal stability.

## Predicted equilibrium and measured response metrics

For a stable case after all applied steps, all three final level deviations are equal:

`h∞ = (Lr + Rd)/(1+L)`, and `e∞ = r − h∞ = (r − Rd)/(1+L)`.

These are analytical predictions, distinct from the last point on a finite graph. If the disturbance is scheduled beyond the run, the displayed prediction describes the inputs applied within that run, and a warning identifies the unapplied event.

For setpoint-only input, `e∞ = r/(1+L)`: increasing gain reduces offset. The poles simultaneously move toward the imaginary axis, increasing oscillatory behavior and eventually instability. For disturbance-only input, `h∞ = Rd/(1+L)`; proportional control reduces the disturbance effect but does not remove it completely.

**Overshoot** is measured relative to the response's steady-state change, not to the setpoint. With Δ = h∞ − h(0), the signed-step-safe definition is:

`100 × max(0, max_t[(h3(t)−h3(0))/Δ] − 1)`.

This handles upward and downward steps consistently. It is undefined when Δ = 0. Separately, `crossesSetpoint` reports whether Tank 3 goes strictly beyond the setpoint in the direction of a nonzero setpoint step; equality at time zero does not count. For disturbance-only cases this particular flag is false because there is no setpoint-step direction; inspect the absolute-level plot.

**Settling time** is the first retained sample after the last departure from a band ±2% of |Δ| around the predicted final level, measured after the last input event. The code requires a conservative analytical modal or comparison-system envelope at the run end to be within the band, so later oscillations cannot invalidate settling merely because the graph stopped at a zero crossing. It remains an estimate sampled at every RK4 integration substep, independent of the 1,600 uniform graph intervals. Overshoot and setpoint crossing also use the internal integration samples, so extending the graph does not discard the early transient. Overshoot is sampled and is withheld until that same tail check succeeds. With both a setpoint and a delayed disturbance, overshoot describes the complete run relative to its final change; the UI warning explains that this is not a single-input step-response test.

Marginal and unstable cases have no asymptotic settling metrics; steadyChange, steadyLevel, offset, overshootPct, and settlingTime are null. A stable zero-response case has settlingTime = 0 and undefined percentage overshoot. A nonzero transient with zero net final change has no relative percentage metrics.

## Numerical method and function map

`model.js` is the only production engineering implementation. The UI reads its outputs rather than independently recalculating model quantities.

| Function | Inputs | Outputs and purpose |
|---|---|---|
| `validateCase(c)` | All nine numeric case fields | `{valid, errors, warnings}`. Rejects nonfinite values, nonpositive A/h̄/q̄/duration, negative Kc/time, nonpositive absolute setpoint, L above 1,000, or excessive integration work. Messages name the field and repair. These are built-in rules, not AI advice. |
| `derive(c)` | A valid case | R, τ, L, critical Kc, marginal period, stability, three poles, and transfer-function coefficients. |
| `presets(c)` | Tank conditions | Five labeled gain presets calculated from current R. |
| `rhs(c, derived, x, disturbance)` | Three deviation states and the current flow disturbance | Three time derivatives from the liquid balances. |
| `simulate(c)` | A validated case | Absolute-level time series, controller deviation, total inlet flow, three outlet flows, setpoint, disturbance, derived values, metrics, warnings, and truncation flag. |
| Internal `rk4` | State and constant-forcing substep | Classical fourth-order Runge–Kutta advance. |
| Internal `futureTailBound` | State at the last event and predicted final state | Conservative bound on all later Tank 3 deviations from equilibrium, used to avoid false settling declarations. |

Internal substeps are at most `0.04τ/(1+∛L)` and also stop at output samples and the disturbance event. This is a gain-dependent integration step, **not** an adaptive local-error estimator. The validation work budget is 250,000 internal steps; output boundaries can add up to 1,600 splits. At a state magnitude above one million times h̄, nonfinite output, or work-budget limit, the run is truncated with an explicit warning rather than producing overflow or a misleading chart.

Model-validity warnings are separate from input validity. A 20% excursion is a transparent teaching heuristic for questioning the local linear approximation; it is not a proven accuracy bound. Negative absolute levels or negative total inlet flow are physically impossible predictions of the unconstrained linear model. Values are not silently clipped. Tank artwork may visually limit its fill, but numerical labels and chart values must retain the computed result.

## Default case, independently checked

A = 1 m², h̄ = 1 m, q̄ = 0.2 m³/min, Kc = 0.2 m²/min, r = 0.2 m, d = 0, duration = 120 min. This yields:

| Quantity | Result |
|---|---:|
| R | 10 min/m² |
| τ | 10 min |
| L | 2 |
| Critical Kc | 0.8 m²/min |
| H3/SP | 2/(1000s³+300s²+30s+3) |
| Poles [min⁻¹] | −0.225992105; −0.037003948 ± 0.109112364j |
| Predicted final Tank 3 level | 1.133333333 m |
| Predicted offset below 1.2 m setpoint | 0.066666667 m |
| Sampled overshoot of final change | 29.8646427% |
| Setpoint crossed? | No |
| Sampled 2% settling time | 100.725 min |
| Tank 3 at 120 min | 1.131703402 m |

The default illustrates why overshoot and crossing the setpoint are different. Tank 1 exceeds the 20% excursion heuristic, so the default also carries a local-model caution.

## Verification evidence

Executed with Node v24.22.2: `node --test tests/model.test.mjs`. All **31 tests passed** on 2026-11-11 (America/New_York). The independent reference computes the real exponential and sinusoidal modes of the closed-loop cubic rather than calling the production integrator. It checks all three tank trajectories against RK4 at many times; delayed inputs are verified by superposition. Default comparison tolerance is 2×10⁻⁷ m for values near 1 m (relative scaling for larger values). Unstable growth is checked with a 10⁻⁶ scaled tolerance.

Tests cover the default, cubic roots, stable setpoint-only, disturbance-only, delayed combined inputs, downward steps, Kc = 0, zero forcing, L = 7.999999/8/8.000001, the marginal period, unstable trajectories, changed-R presets, invalid values, computation limits, short runs, slow near-boundary settling, events beyond the run, controller/inflow identities, conservation balances, canceling inputs, deterministic repeatability, overshoot versus crossing, nonphysical predictions, numerical truncation, overflow rejection, very small valid time scales, long-window metric accuracy, near-zero-gain settling, and exact two-sided disturbance samples. Browser checks are recorded separately by the site owner; this file does not claim browser testing.

## Engineering references

The algebra and numerical implementation above are independently developed for this project. These sources support the underlying modeling and analysis methods:

1. Jeffrey Kantor, University of Notre Dame, [Step Response of a Gravity Drained Tank](https://jckantor.github.io/CBE30338/03.01-Step-Response-of-a-Gravity-Drained-Tank.html). Material balance and gravity-drain response modeling.
2. John D. Hedengren / BYU, [Lecture 15: Linearization](https://byu.apmonitor.com/che436/index.php/Main/LectureNotes15). Local linear models and their limitations away from the operating point.
3. NPTEL, [Closed-loop response of liquid level in a storage tank](https://archive.nptel.ac.in/content/storage2/courses/103103037/module4/lec4/2.html). Linearization, deviation variables, and transfer functions for liquid-level feedback.
4. MIT OpenCourseWare, [Electronic Feedback Systems, Chapter 4: Stability](https://ocw.mit.edu/courses/res-6-010-electronic-feedback-systems-spring-2013/57775ed94c7ade118a391791eb8603b1_MITRES_6-010S13_chap04.pdf). Routh stability criterion; pp. 110–111 also analyze the same normalized three-lag loop and boundary gain 8.
5. MathWorks, [stepinfo documentation](https://www.mathworks.com/help/control/ref/dynamicsystem.stepinfo.html). Step-response characteristics measured relative to initial and final response values.

Sources checked 2026-11-11. The L = 8 result and the three-tank numerical values are independently derived here. MIT’s normalized three-lag example provides a directly matching algebraic cross-check.
