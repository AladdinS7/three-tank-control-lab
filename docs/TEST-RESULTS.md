# Verification record

Date: November 11, 2026 (America/New_York). Tests below were executed, not merely proposed.

## Original baseline

Kyle Conner's original commit `3ec2f8be401d176b54f7a8297215f840ba0b4638` was inspected without remote changes. Its `python3 solver.py` self-tests passed. Independent inverse-Laplace evaluation agreed with its 241 default samples within 4.06 × 10⁻¹¹ m. See [original review](ORIGINAL-REVIEW.md).

## New engineering engine

Command: `node --test tests/model.test.mjs`, Node v24.22.2. **31 tests passed, 0 failed.** No runtime or test dependencies are required.

Coverage includes default coefficients and poles; independent closed-form trajectories for all three tanks; setpoint-only, disturbance-only, combined and delayed steps; negative steps; zero gain and zero inputs; L = 7.999999, 8, and 8.000001; marginal frequency; unstable growth; changed-R presets; signed overshoot versus setpoint crossing; conservation/output identities; short runs; near-boundary tails; zero net final change; out-of-window disturbances; invalid and extreme inputs; valid tiny time scales; long-window overshoot consistency; near-zero gain; nonphysical predictions and numerical truncation; and exact pre/post disturbance event samples.

Independent mathematical references are separate from production RK4. The default gives final predicted h3 = 1.133333333 m, offset = 0.066666667 m, peak h3 ≈ 1.173152857 m, overshoot ≈ 29.8646%, no setpoint crossing, and h3(120) ≈ 1.131703402 m. Settling is a numerical estimate (about 100.7 min); differences from Kyle's coarser sampled estimate are documented.

Review caught and corrected overflow acceptance, skipped integration at very small scales, ill-conditioned near-zero-gain tail checking, long-run metric undersampling, and disturbance steps being drawn as ramps. Outflows are calculated in model.js and consumed by the ledger.

## Real browser checks

The site was served at `http://127.0.0.1:8000/three-tank-control-lab/` to test a project-path deployment. Browser interaction used the Codex in-app Chromium browser; GitHub publishing used the user's signed-in Google Chrome session.

| Check | Observed result |
|---|---|
| Default load | Ready status, default R/τ/L, metrics, poles, charts and ledger rendered; no application console errors |
| Guided first case | Review modal opens, prediction is saved, Apply starts playback |
| Back to edit | Closes review without replacing the applied run |
| Invalid tank area = 0 | Rejected with the broken rule and repair; focus returns to the area field |
| Play / pause / step / rewind | Play advances, pause stops, step advances one retained sample, rewind returns to zero |
| Keyboard slider | End reaches 120 min; ArrowRight advances one sample; values update in diagram and ledger |
| Keyboard navigation | Tab moves to the next control; visible focus outline confirmed; native dialog/select controls usable |
| Gain comparison | A at L=2 versus B at L=7.5; all non-gain inputs held equal; A overlay and separate predicted offsets displayed |
| Changed operating point | Doubling steady flow halves R; all gain preset Kc values double, maintaining their loop gains |
| Marginal preset | L=8 labeled MARGINAL, imaginary-axis poles, equilibrium/overshoot/settling values withheld |
| Unstable preset | L=9 labeled UNSTABLE, positive-real-part poles, nonsettling metrics withheld |
| Disturbance exercise | SP change=0, d=.02 at30, run180; controller reaction and final ledger consistent; directed setpoint crossing marked not applicable |
| Short run | 1-min stable run retains clearly labeled predicted equilibrium but withholds unresolved overshoot/settling |
| Reset | Restores default fields, run, time zero, and clears comparison |
| Mobile | 390×844 viewport: document width390 (no page overflow), responsive input groups, readable plots; signal diagram scroll confined to its own panel |
| Desktop | 1440×1000 viewport: process diagram, coordinated signal diagram, settings, metrics and both plots visually inspected |
| Solver-load failure | Separate fixture intentionally omitted model.js: clear recovery message and disabled run controls; theory stays readable |
| Retry | Retry button reloads the page; persistent missing-module fixture remains unavailable as expected |

UI changes made during QA: integer sample slider; explicit warning visibility; scientific notation for small/large values; graph viewBox sized to the rendered width for readable mobile axes; larger phone text; corrected documentation links; disturbance summing block; avoided rapidly updating screen-reader live-region announcements from the inspector.

## Scope and remaining limits

This is a deterministic linear teaching model, not validated tank hardware. No physical experiments, nonlinear tank solver comparison, actuator saturation, or sensor-delay model were performed. Browser QA is a recorded manual scenario pass, not an automated exhaustive UI regression suite. Screen-reader output, actual iOS/Android hardware, Firefox/Safari, and prolonged stress sessions were not tested. A 20% deviation warning is an openly labeled heuristic, not a certified accuracy bound.

GitHub Pages live verification will be recorded below after publication.
