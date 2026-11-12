# Three Tank Control Lab

A student-focused Process Dynamics laboratory by AladdinS7: follow water through three tanks, predict what a proportional controller will do, and test how feedback gain changes the response.

**Project reference and credit:** Kyle Conner created the first iteration, [Three Tanks in Series: Closed-Loop Transfer Function](https://kconner25.github.io/three-tank-closed-loop/) ([original repository](https://github.com/kconner25/three-tank-closed-loop)). This separate project uses a fresh implementation. Kyle's repository has no license or explicit reuse grant, so no original implementation, text, or assets are redistributed here. His repository and site remain untouched. The layout direction also draws on AladdinS7's [Propane Separation Lab](https://aladdins7.github.io/propane-separation-lab/).

Live site: [GitHub Pages](https://AladdinS7.github.io/three-tank-control-lab/) · [repository](https://github.com/AladdinS7/three-tank-control-lab). **Published and verified on November 11, 2026.** The default solver, guided run, process inspector, and reset were exercised at the live project URL. See the [verification record](docs/TEST-RESULTS.md).

## Start the lab

No packages or build step are required to run the website. From this directory:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Serve over HTTP; opening index.html directly as a file can block module and source loading.

Run the dependency-free numerical tests with Node.js 20 or newer:

```sh
npm test
```

## The learning path

Start with Kyle's default: A=1 m², steady level=1 m, steady flow=0.20 m³/min, Kc=0.20 m²/min, setpoint change=+0.20 m, no disturbance, and 120 min. Predict the response before running it. Click a tank or feedback block to connect the physical process with the signals. Use playback to see Tank 1 respond before Tank 3, and compare gains while the other settings stay fixed.

The redesigned experience includes coordinated process and feedback diagrams, guided input review, explanations of built-in validation rules, gain presets expressed relative to the current resistance, a gain-only comparison, separate controller and disturbance signals, and a derivation tied to the running source code. Marginal and unstable responses are learning examples rather than recommended operating conditions.

## Model and source of truth

All engineering calculations live in **model.js**. **app.js** renders the results and coordinates interactions; **index.html** and **styles.css** define the interface; **boot.js** handles module loading and its failure state. The diagrams, charts, worked values, poles, and metrics consume the same model results.

Let xᵢ=hᵢ−hₛ be a level deviation, r the Tank 3 setpoint change, d the added inlet-flow disturbance, and u the controller's flow deviation. The model is:

```text
q_out = k sqrt(h), linearized at (h_s, q_s)
R = 2 h_s / q_s                  [min/m²]
tau = A R                       [min]
u = Kc (r - x3)                  [m³/min]
A dx1/dt = u + d - x1/R
A dx2/dt = (x1 - x2)/R
A dx3/dt = (x2 - x3)/R
```

With zero initial deviations, one inlet-to-level tank block is R/(τs+1). The next two level-to-level blocks each have gain one because upstream outflow is x/R. Thus the plant is R/(τs+1)³. Ideal negative unity feedback gives:

```text
H3(s)/SP(s) = Kc R / [(tau s + 1)^3 + Kc R]
H3(s)/D(s)  = R    / [(tau s + 1)^3 + Kc R]
```

Kc has units m²/min, while L=KcR is dimensionless. For Kc≥0, the loop is asymptotically stable for L<8, marginal at L=8, and unstable for L>8. The critical dimensional controller gain is 8/R. Increasing gain reduces stable steady-state offset while reducing damping. A response can overshoot its own final change without ever crossing the setpoint.

The tanks are identical and noninteracting: each gravity outlet depends on its own tank level and discharges freely to the next tank. The liquid is incompressible, area is constant, and drainage is linearized about a positive common steady state. The sensor and actuator are ideal: no lag, dead time, noise, saturation, or valve constraints. Large deviations, negative predicted levels, and negative inlet flows invalidate physical interpretation. This is a linear teaching model, not a plant-design prediction. Algebraic equilibrium values must not be presented as attained steady states for marginal or unstable loops.

## Verified reference baseline

Kyle's original `python3 solver.py` self-tests passed at commit `3ec2f8be401d176b54f7a8297215f840ba0b4638`. An independent inverse-Laplace calculation checked the default transient against his RK4 solver, with maximum sample error 4.06×10⁻¹¹ m.

| Default quantity | Reference value |
| --- | ---: |
| Resistance R | 10 min/m² |
| Time constant τ | 10 min |
| Loop gain KcR | 2 |
| Final Tank 3 change | 0.1333333333 m |
| Steady-state offset | 0.0666666667 m |
| Peak Tank 3 change | 0.1731528572 m |
| Peak time | 33.59898775 min |
| Overshoot relative to final change | 29.86464287% |
| Tank 3 change at 120 min | 0.1317034016 m |
| Critical Kc | 0.8 m²/min |

See [original review](docs/ORIGINAL-REVIEW.md) for the executed baseline, existing test scope, and specific issues addressed. The new engineering suite passes 31 tests. Real-browser checks cover guided review, invalid values, comparisons, presets, playback, keyboard controls, phone layout, project-path loading, and solver-load failure. See [test results and remaining limits](docs/TEST-RESULTS.md).

## Best classroom demonstration

1. Run the default L=2 case. Explain why Tank 3 settles below the setpoint even though the transient overshoots its own final change.
2. Compare L=2 with L=7.5 using otherwise identical conditions. Predict the tradeoff, then inspect smaller expected offset and more persistent oscillation. Extend the duration if needed; a short record does not prove settling.
3. Select L=8, then L=9. Connect sustained and growing oscillations to poles on and to the right of the imaginary axis.
4. Reset and test disturbance rejection separately: setpoint change=0, disturbance=+0.02 m³/min at 30 min. Explain why the added inlet flow changes while the requested level stays constant.

## Contribution and provenance

AladdinS7 defined the student learning goals, requested the redesign and independent validation, selected the previous propane lab as a design reference, and authorized a separate public repository. Kyle supplied the original project and model reference. AI assistance implemented and tested the new work described in the [activity log](docs/ACTIVITY-LOG.md). The [prompt record](docs/PROMPTS.md) preserves the user's brief. No exact underlying AI model version or model-to-model performance comparison has been verified or claimed.

For engineering evidence and model assumptions, begin with the [model derivation and primary references](docs/MODEL.md), [original review](docs/ORIGINAL-REVIEW.md), the derivation on the website, and the model source. Mathematical statements are derived from the stated balances; external references are for learning context, not evidence of experimental validation.
