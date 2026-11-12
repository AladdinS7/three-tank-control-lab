# Original-project audit

Reviewed 2026-11-11 (America/New_York), repository `kconner25/three-tank-closed-loop`, main commit `3ec2f8be401d176b54f7a8297215f840ba0b4638` (commit tree `02c2a5d68fbc9125470bd826befd66c3562f238f`). Public source was retrieved through the connected GitHub tool after shell git could not resolve github.com. The audit copy is for inspection/testing only, outside the new deliverable.

## Reuse decision

The complete root tree contains README.md, app.js, index.html, solver.py, and style.css. No LICENSE file; repository metadata reports license=null. README contains no general reuse permission. Therefore do not redistribute Kyle's code, text, or assets. Implement the mathematical model and interface afresh and credit/link Kyle's original as the project reference. The mathematical equations and experimentally checked numerical baseline can be independently expressed.

## What exists and should be retained conceptually

A buildless page uses Python solver.py via Pyodide 0.26.4 and Plotly 2.35.2. A sidebar holds seven operating inputs and fixed-gain presets; three panels contain the App, Theory, and actual Python source split into annotated sections. It includes transfer functions, poles/damping, ultimate gain/period, three levels, inflow chart, click-to-inspect process blocks, playback/back/step/slider, final-level ledger, gain sweep, and reset. The solver is substantially the engineering source of truth, though app.js duplicates denominator expansion and default inputs. The default and mathematical derivation are useful; preserve accessible code explanation, step playback, inspector, ledger, and gain study.

## Executed baseline

Command: `python3 solver.py` in the audit copy. Exit code 0; output: `All self-tests passed.` Full stdout saved as self-tests.txt; complete default result saved as baseline.json.

Inputs: A=1 m², hs=1 m, qs=0.20 m³/min, Kc=0.20 (m³/min)/m, setpoint step=0.20 m, disturbance step=0 m³/min, simulation duration=120 min. Both steps start at t=0.

- R=10 min/m²; tau=10 min; loop gain KcR=2.
- Plant numerator [10], denominator [1000,300,30,1].
- Closed-loop setpoint numerator [2], denominator [1000,300,30,3]. Disturbance numerator [10], same denominator.
- DC gain=2/3; final level change=0.13333333333333333 m; level=1.1333333333333333 m; offset=0.06666666666666667 m.
- Ultimate Kc=0.8 m²/min; ultimate period=36.275987284684355 min.
- Poles: -0.22599210498948735, -0.03700394750525634 ± 0.10911236359717214i min⁻¹.
- Original RK4: Δh3(120)=0.13170340155343443 m; peak change=0.1731528569113198 m at 33.6 min; overshoot=29.864642683489844%; reported sampled 2% settling time=100.5 min. This settling estimate is last sample outside the band, rather than first sample inside after the last exit.

Independent default verification used inverse Laplace partial fractions of N/[s D(s)], with N=KcR*ΔSP=0.4, D=(tau*s+1)^3+KcR. Residues are N/[p*D'(p)] at each distinct closed-loop pole p. It did not reuse the original integration algorithm. Results: Δh3(120)=0.13170340155680998 m; exact peak time=33.598987752384744 min; peak change=0.1731528571597914 m; overshoot=29.86464286984354%. Maximum absolute difference from original RK4 across its 241 samples was 4.054010599441327e-11 m. Details saved in independent-default.json.

## Tested by the original self-test suite

Default constants, transfer-function DC gain, analytical final/offset, negative-real-part poles, RK4 endpoint near final, positive overshoot, no-control setpoint response, disturbance-only final, imaginary poles at KcR=8, and positive-real-part poles above it. Existing assertions do not test browser behavior, invalid values, signed steps, time-step convergence, zero steps, exact transfer-function transient, or solver-loading errors.

## Changes justified by inspection

1. Distinguish marginal KcR=8 from unstable KcR>8; original bool `stable` labels both UNSTABLE and claims growing response at the boundary.
2. Suppress steady-state/settling interpretation for marginal or unstable cases. Original displays final levels, DC gain, servo offset, and overshoot even there.
3. Scale gain presets and gain-sweep points by current R. Original hard-codes Kc values, making labels misleading when tank conditions change.
4. Separate controller flow from total inlet including disturbance. Original `u` combines them and initial u_dev is incorrectly recorded as zero despite a setpoint step at t=0.
5. Actual combined-step offset must include disturbance; original card's `servo_offset` only uses the setpoint contribution.
6. Signed-step overshoot should use the response direction and final change; original computes only positive peaks and positive final changes. Explicitly distinguish overshoot of final response from crossing setpoint.
7. Provide a real physical tank diagram and a distinct negative-feedback block diagram; original blocks are labeled rectangular units rather than coordinated physical/signal views.
8. Add deliberate input review, actionable validation, prediction, pairwise gain-only comparison, and guided exercises. Original applies every edit immediately.
9. Broaden model-range checks: original only warns if analytical final level is <=0, missing transient nonphysical levels/inflows and large deviations.
10. Improve tab selected-state/keyboard handling and source-loading error recovery. Original tab roles omit aria-selected/tab controls; load failure message exists but no explicit retry and fetch status is unchecked.

Browser rendering and live-site observations are handled by the parent task, so this audit does not claim browser QA.

