# Prompt and major-change record

Date: November 11, 2026 (America/New_York).

## Student brief — verbatim

The following is the user's project request. The original attachment's local machine path is omitted. This record captures the requested goals; it is not evidence that every requested check has been performed.

Help me build my own improved iteration of my groupmate Kyle Conner’s Process Dynamics website: “Three Tanks in Series: Closed-Loop Transfer Function.”

Original website: https://kconner25.github.io/three-tank-closed-loop/
Original GitHub repository: https://github.com/kconner25/three-tank-closed-loop
Design reference from my previous project: https://aladdins7.github.io/propane-separation-lab/

I want to follow the same workflow I used on the propane project: start from my groupmate’s first version, understand what already works, redesign the experience around how students learn, test it thoroughly, and publish my improved version in a separate repository under my GitHub account, AladdinS7. Credit Kyle and link to his original project in the README and on the website. Leave his repository and site untouched. Check reuse permissions before copying code or assets; if permission is unclear, build a fresh implementation and credit the original as the project reference.

1. Review the original before changing it

Open the live website and read the README and source files. Run the existing solver tests and record the default case as a baseline. Briefly explain what is already there, what is worth keeping, and what you would improve. Then do the work. I want a working website, not just a design plan. Keep one source of truth for the engineering calculations so the diagrams, charts, examples, and explanations all agree.

2. Make the science easy to follow

Assume the student has never studied feedback control. Start with a simple question: “If I want Tank 3’s liquid level to rise, how should I change the inlet flow to Tank 1, and what happens if the controller reacts too strongly?”

Use two coordinated visuals: a physical diagram showing liquid flowing through Tanks 1, 2, and 3, and a block diagram showing the setpoint, error, proportional controller, plant, measured Tank 3 level, and negative feedback. Let the student click each tank or block to learn what it does. Use the same symbols and colors across both diagrams and the charts.

Teach the derivation one step at a time: write the tank balance, explain gravity drainage and linearization around steady state, derive R and τ, multiply the three tank blocks in series, and close the loop using block diagram algebra. For the original model of identical, noninteracting tanks and ideal unity feedback, explain how Gp(s) = R/(τs + 1)^3 leads to H3(s)/SP(s) = KcR/[(τs + 1)^3 + KcR]. Explain what the symbols mean, where the units come from, and which assumptions make these equations valid. Show a worked example using Kyle’s default case so we can compare the two versions. Explain the actual code that runs the calculation, with the inputs, outputs, and purpose of each major function.

3. Turn the simulator into a guided experiment

Give students a clear starting point with a guided default case, then let them edit tank area, steady level, steady flow, controller gain, setpoint step, inlet disturbance, and simulation time. Show units and suggested values next to the inputs. Before applying a case, explain what to look for and let the student continue with their own valid values or go back and edit. For a rejected value, explain which rule it breaks and how to fix it. Make it clear when the feedback comes from built-in rules.

Make controller gain the main experiment. Add presets for no control, a stable case, a case near the stability limit, the marginal boundary, and an unstable case. Calculate the presets relative to the current R so they still make sense when the tank conditions change. Let students predict what will happen, then compare two runs with different gains and otherwise identical settings.

Show all three tank levels over time, the Tank 3 setpoint, and the controller output. Make the play, pause, step, and time slider controls work together. Show the closed-loop poles and explain what they say about stability. Explain the tradeoff in plain language: increasing gain can reduce steady-state offset while making the response more oscillatory, and too much gain can destabilize this model. Clearly distinguish a setpoint change from an inlet-flow disturbance, and show what changes when the disturbance is applied.

For this model, teach the difference between Kc and the dimensionless loop gain KcR. Explain why KcR = 8 is the marginal boundary and why the critical Kc depends on R. Show marginal and unstable cases as labeled learning examples. Avoid displaying steady-state or settling metrics when the response does not settle. Define overshoot relative to the response’s steady-state change, and show how that differs from whether the level crosses the setpoint. If a case pushes the linear model beyond its useful range, explain why the result should be interpreted with care.

4. Make the site polished and test it deeply

Use a clean, responsive layout with a prominent process visual, readable plots, and a clear path from “Run your first case” to the theory and code. Make it usable on a phone and with a keyboard. Preserve useful features from Kyle’s version. Include short “try this next” exercises for setpoint tracking, disturbance rejection, and the gain tradeoff.

Verify the default case independently. Test the transfer function, zero gain, zero steps, setpoint-only and disturbance-only cases, and gains just below, at, and above the stability boundary. Check that the numerical results agree with the analytical results where applicable. Test invalid inputs, short runs, reset, presets, comparisons, playback, keyboard navigation, and mobile layout in a real browser. Verify that the site loads from a GitHub Pages project path and handles solver-loading errors clearly. Record what you actually tested and what remains open.

5. Publish and document my contribution

Create a new GitHub repository under my AladdinS7 account, with a name like three-tank-control-lab, and publish the tested site on GitHub Pages if the connected account permits it. I authorize creating that separate public repository and publishing this class project there. Verify the live URL before calling it done. If publishing is blocked, give me the complete local project or a downloadable ZIP and the exact remaining steps.

Include a README, engineering references, model assumptions, test results, and an activity log I can use for class. The log should distinguish Kyle’s first iteration, my design goals and decisions, and what the AI implemented or tested. Keep a record of the prompts and major changes so I can explain my contribution in a presentation. Report actual model names and comparisons only when verified. Finish with the live site and repository links, a short list of what improved, and the best scenario to demo in class.

## Execution decisions derived from this brief

- Reviewed Kyle's complete source tree and README and executed his solver before implementing the new version.
- No license or explicit reuse permission was found. Chose a fresh implementation with attribution rather than redistributing the source or assets.
- Preserved the original numerical default as a comparison fixture and checked it independently by inverse Laplace partial fractions.
- Assigned all engineering calculation responsibility to model.js; the interface consumes model results.
- Chose presets in dimensionless loop gain so labels remain meaningful when the tank resistance changes.
- Chose prediction and case-review steps, then gain-only comparison, as the main learning sequence.
- Kept marginal, unstable, short-record, and nonphysical model cases explicit in the teaching content.
- Planned separate controller-flow and inlet-disturbance signals to avoid conflating actuation with added inflow.
- Kept deployment and browser verification claims pending until observed.

## AI implementation instructions — summary

The AI work was organized into bounded tasks: original source/license audit and baseline execution; engineering model and numerical validation; new page design and interactions; browser QA and publication; and contribution/provenance documentation. These are execution-task summaries, not verbatim hidden reasoning or claims that the student authored the code. The activity log and final test report distinguish checks actually executed from open items.

No exact underlying AI model version or model-comparison claim was verified. The record therefore names Codex as the assistance environment without inventing a model identifier.

## Follow-up direction

The student allowed use of their open Chrome session and reiterated that this must be a separate three-tank project, leaving their existing propane website unchanged. After automatic approval review requested direct authorization, the student confirmed: “Yes, create and publish the new public project.”

Major implementation instructions to AI collaborators: independently audit Kyle's original/default and reuse permissions; independently derive and test the model; build fresh responsive HTML/CSS; use one engineering source of truth; review numerical and UI edge cases; preserve truthful attribution and test records. No model-to-model quality comparison was conducted.
