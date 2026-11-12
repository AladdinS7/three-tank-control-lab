# Activity and contribution log

Date: **November 11, 2026**, America/New_York. This log distinguishes the reference project, the student's requested design direction, and the work executed with AI assistance. It does not claim that requested or planned checks have already passed.

## Kyle Conner — first iteration

Kyle's public project was inspected at main commit `3ec2f8be401d176b54f7a8297215f840ba0b4638` dated November 9, 2026. It provides the identical-tank model, proportional unity-feedback derivation, worked default case, Python solver, self-tests, clickable inspector, response and controller charts, playback, level ledger, gain study, and Theory / Python explanation panels. Its README credits the propane separation lab as an interface reference and reports AI-assisted construction; this log does not independently verify which model was used for that earlier project.

No license or reuse grant was present. A local audit copy was used solely to read and execute the original solver. No original source or assets are included in this repository.

## AladdinS7 — design goals and decisions

The student requested a new public project in a separate repository, prominent attribution to Kyle, and no modifications to Kyle's repository or website. The student selected the previous Propane Separation Lab as a design reference and supplied the following learning priorities:

- Begin with a novice's question about increasing Tank 3 level and reacting too strongly.
- Coordinate physical tanks, feedback blocks, charts, symbols, and colors.
- Teach the balance, linearization, units, assumptions, block algebra, and actual running code.
- Make gain the main experiment; include prediction, review, comparison, and guided exercises.
- Scale presets by R and distinguish dimensional Kc from dimensionless KcR.
- Treat the marginal boundary correctly and withhold invalid settling claims.
- Separate disturbance rejection from setpoint tracking and explain model limitations.
- Verify numerical behavior independently and check real browser interactions, mobile layout, keyboard use, loading errors, and deployment.
- Preserve an honest record of prompts, changes, and executed checks for a class presentation.

These are user-specified goals. The log does not imply that the student personally wrote the implementation or ran the automated checks.

## AI-assisted work actually completed during the reference audit

1. Retrieved repository metadata, README, and all four source files through the connected GitHub tools. Checked the complete file tree for reuse permissions.
2. Read the original solver and UI wiring. Identified marginal/unstable labeling, displayed nonsettling metrics, fixed dimensional presets, combined disturbance/controller output, signed overshoot limitations, and missing comparison/review steps as concrete improvement targets.
3. Executed the original `python3 solver.py`; exit code 0 and all bundled self-tests passed.
4. Recorded the complete original default result and stdout in the local audit workspace, excluded from publication.
5. Independently calculated the default Tank 3 transient from inverse Laplace partial fractions. At every original time sample, agreement with RK4 was within 4.0541×10⁻¹¹ m. Exact peak time was 33.5989877524 min; exact peak level change was 0.173152857160 m.
6. Prepared original-review, contribution, and prompt documentation without copying Kyle's implementation or prose.

## New implementation change record

The implementation is being authored afresh around a dependency-free JavaScript engineering module (`model.js`), rendering/interaction code (`app.js`), an HTTP-served page (`index.html` / `styles.css`), and explicit module-load handling (`boot.js`). It carries forward the model and useful learning concepts while implementing the student-requested workflow. The parent task will append the final implementation details and verified test results below when those checks complete.

## Verification ledger

| Check | Actual status at documentation handoff |
| --- | --- |
| Original README/source/license review | Completed |
| Original solver self-tests | Passed, executed locally |
| Original default independently checked | Passed, inverse Laplace vs RK4 |
| New model numerical tests | Pending final test record |
| Browser controls, validation, reset, presets, compare | Pending final test record |
| Keyboard navigation and mobile layout | Pending final test record |
| Solver-load error and project-path loading | Pending final test record |
| Repository creation and GitHub Pages live URL | Pending verification |

Model reporting: AI assistance was provided through Codex. The precise underlying model identifier and any comparative model-performance claims were not independently verified, so none are asserted.

## Completed implementation and verification

The AI implemented fresh dependency-free HTML/CSS/JavaScript, an original process diagram and signal diagram, shared model.js calculations, review/predict/apply flow, R-relative gain presets, fair A/B gain comparison, all-tank and flow plots, synchronized playback, ledger/CSV export, theory/code walkthrough, and model-validity messages. The student's brief supplied the learning goals and comparison workflow; AI assistance performed implementation and the recorded checks.

Independent review triggered fixes for numeric overflow, tiny-scale integration, long-run overshoot undersampling, near-zero gain tails, exact disturbance jumps, and phone readability. The final engineering suite passed 31 tests. Real-browser scenarios and limitations are detailed in [TEST-RESULTS.md](TEST-RESULTS.md).

The student reiterated that the propane website must remain untouched. All new work stays in a separate project. When automatic approval review did not recognize authorization in the pasted brief, the student directly confirmed: “Yes, create and publish the new public project.” No modifications were made to Kyle's repository or the student's propane repository.
