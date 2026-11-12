import { DEFAULTS, validateCase, derive, presets, simulate } from './model.js';
const $ = id => document.getElementById(id);
const fields = Object.keys(DEFAULTS);
const f = (n, digits = 3) => !Number.isFinite(n) ? '—' : n !== 0 && (Math.abs(n) < 10 ** -digits || Math.abs(n) >= 1e6) ? n.toExponential(3) : Number(n.toFixed(digits)).toString();
const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let run, saved, comparison = false, index = 0, timer, pending, selectedUnit = 'tank3', prediction = 'unsure';
const readCase = () => Object.fromEntries(fields.map(key => [key, $(key).value.trim() === '' ? NaN : Number($(key).value)]));
function fillCase(c) { fields.forEach(key => $(key).value = c[key]); refreshPresets(); }
function refreshPresets() {
  const c = readCase();
  if (![c.area,c.level,c.flow].every(v => Number.isFinite(v) && v > 0)) return;
  const ps = presets(c);
  $('preset').innerHTML = '<option value="custom">Choose a gain experiment</option>' + ps.map(p => `<option value="${p.id}">${esc(p.label)} · Kc ${f(p.gain,5)} · L ${f(p.loopGain)}</option>`).join('');
  const d = derive(c);
  $('derived-summary').innerHTML = `Draft conditions: <b>R = ${f(d.R)} min/m²</b> · τ = ${f(d.tau)} min · critical Kc = ${f(d.criticalGain,5)} m²/min. Presets adjust to this R.`;
}
function pause() { clearInterval(timer); timer = undefined; $('play').disabled = false; $('pause').disabled = true; }
function play() {
  pause(); if (index >= run.points.length - 1) index = 0;
  $('play').disabled = true; $('pause').disabled = false;
  timer = setInterval(() => { index = Math.min(run.points.length - 1, index + Math.max(1, Math.ceil(run.points.length / 360))); updateCursor(); if(index >= run.points.length - 1) pause(); }, 50);
}
function showErrors(result) {
  fields.forEach(key => { $(key).removeAttribute('aria-invalid'); $(key).setAttribute('aria-describedby', `${key}-hint`); });
  $('field-errors').innerHTML = '';
  if (result.valid) return false;
  $('field-errors').innerHTML = '<b>Built-in validation rules</b><ul>' + result.errors.map((e,i) => `<li id="error-${i}">${esc(e.message)}</li>`).join('') + '</ul>';
  result.errors.forEach((e,i) => { if($(e.field)) { $(e.field).setAttribute('aria-invalid','true'); $(e.field).setAttribute('aria-describedby',`${e.field}-hint error-${i}`); } });
  $(result.errors.find(e => $(e.field))?.field || 'field-errors').focus();
  return true;
}
function review(c, isComparison = false) {
  const v = validateCase(c); if(showErrors(v)) return;
  pause(); pending = { c, isComparison };
  const d = derive(c);
  $('review-content').innerHTML = `<p><strong>Built-in coaching rules · ${esc(d.stability)} case</strong></p><p>Kc = ${f(c.gain,5)} m²/min; dimensionless loop gain L = KcR = <b>${f(d.loopGain)}</b>. The marginal boundary is L = 8 (Kc = ${f(d.criticalGain,5)}).</p><p>${d.loopGain === 0 ? 'With no controller action, a setpoint change cannot move the level. A flow disturbance can.' : d.stability === 'stable' ? 'Look for Tank 1 to move first, then Tank 2, then Tank 3. For a setpoint-only step, expect a remaining offset. Gains closer to 8 decay slowly and oscillate more.' : 'This is a labeled learning example. Watch whether oscillations persist or grow. Steady-state and settling metrics will be withheld.'}</p><p>Setpoint change: ${f(c.setpoint)} m at t = 0. Extra inlet flow: ${f(c.disturbance)} m³/min at t = ${f(c.disturbanceTime)} min. Run length: ${f(c.duration)} min.</p>${isComparison ? '<p><b>Controlled comparison:</b> run B uses every saved run A setting except Kc.</p>' : ''}${v.warnings.map(w => `<p class="warning">${esc(typeof w === 'string' ? w : w.message)}</p>`).join('')}<p>These are deterministic model rules, not a live AI assessment. You can continue with these valid values or go back to edit.</p>`;
  $('review-dialog').showModal();
}
function apply(c, isComparison = false) {
  pause(); run = simulate(c); comparison = isComparison; index = 0;
  if(!isComparison) { saved = undefined; $('compare-summary').textContent = 'Save a run, then change only Kc to make a fair comparison.'; }
  fillCase(c); $('time-slider').max = run.points.length - 1;
  $('time-slider').value = 0;
  $('run-summary').textContent = `${comparison ? 'Run B' : 'Applied case'} · Kc ${f(c.gain,5)} · L ${f(run.derived.loopGain)} · ${f(c.duration)} min. ${prediction !== 'unsure' ? `Your prediction: ${prediction}. Compare it with the curves.` : 'Watch the order of the tank responses.'}`;
  renderResults(); drawCharts(); updateCursor();
}
function renderResults() {
  const { derived:d, metrics:m, case:c } = run;
  $('stability-badge').textContent = `${d.stability.toUpperCase()} · L = ${f(d.loopGain)}`;
  $('stability-badge').dataset.state = d.stability;
  const cards = [
    ['Predicted final Tank 3',m.steadyLevel == null ? 'Not reported' : `${f(m.steadyLevel,4)} m`,'Analytical limit; stable model only'],
    ['Predicted offset',m.offset == null ? 'Not reported' : `${f(m.offset,4)} m`,'Setpoint minus final Tank 3 level'],
    ['Tank 3 overshoot',m.overshootPct == null ? 'Not resolved' : `${f(m.overshootPct,2)}%`,'Relative to steady-state change, not setpoint'],
    ['Settling time · 2%',m.settlingTime == null ? 'Not resolved' : `${f(m.settlingTime,1)} min`,'Elapsed after last input event; sampled estimate']
  ];
  $('metrics').innerHTML = cards.map(([label,value,note]) => `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('poles').innerHTML = `<b>Closed-loop poles [min⁻¹]</b><br>${d.poles.map(p=>`${f(p.re,6)}${Math.abs(p.im) > 1e-10 ? ` ${p.im < 0 ? '−' : '+'} ${f(Math.abs(p.im),6)}i` : ''}`).join(' &nbsp; · &nbsp; ')}<p>${d.stability === 'stable' ? 'All real parts are negative: small perturbations decay. Imaginary parts indicate oscillatory modes.' : d.stability === 'marginal' ? 'A pair lies on the imaginary axis: oscillations persist without decay. This ideal boundary is not a robust operating point.' : 'A pair has positive real parts: small perturbations grow. The linear model is unstable even if an exactly unforced simulation stays flat.'}</p><p>H₃(s)/SP(s) = ${f(d.loopGain)} / [(${f(d.tau)}s + 1)³ + ${f(d.loopGain)}]. Setpoint crossing in this run: <b>${c.setpoint === 0 ? 'not applicable — no setpoint step' : m.crossesSetpoint ? 'yes' : 'no'}</b>. Crossing the target is a different question from overshoot above the final response.</p>`;
  const notes = [...run.warnings];
  if(m.overshootPct == null || m.settlingTime == null) notes.push('Unresolved metrics may mean a nonsettling case, insufficient duration, zero steady change, or multiple input events. Extend a stable run to check its tail.');
  $('model-warning').hidden = false;
  $('model-warning').innerHTML = `<b>Model & metric notes · built-in rules</b>${notes.map(w=>`<p>${esc(typeof w === 'string' ? w : w.message)}</p>`).join('')}<p>Levels use a linearized model with no valve saturation or tank height limit. The vessels are schematic; chart values are the calculation. A large excursion or negative flow/level is a model limitation, not a physically valid prediction.</p>`;
  $('save-run').disabled = false; $('compare-run').disabled = !saved;
  if(comparison && saved) {
    $('compare-summary').innerHTML = `<b>Run A: Kc ${f(saved.case.gain,5)}, L ${f(saved.derived.loopGain)} · ${saved.derived.stability}</b><br>Run B: Kc ${f(c.gain,5)}, L ${f(d.loopGain)} · ${d.stability}. All other inputs are identical. Dashed gray curve = Tank 3 in A; colored curves = B. A/B predicted offsets: ${saved.metrics.offset == null ? 'not defined' : f(saved.metrics.offset,4)+' m'} / ${m.offset == null ? 'not defined' : f(m.offset,4)+' m'}.`;
  }
}
const color = {h1:'#137b70',h2:'#3276b5',h3:'#c16b28',sp:'#243b3b',u:'#6754a2',inflow:'#11665c',d:'#a75043'};
function plot(svg, series, yLabel) {
  const W = Math.max(270, Math.round(svg.getBoundingClientRect().width)), H = svg.id === 'levels-chart' ? 300 : 220;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const pad = {l:65,r:18,t:26,b:42};
  const values = series.flatMap(s => s.points.map(p=>p[s.key])).filter(Number.isFinite);
  let lo = Math.min(...values), hi = Math.max(...values); const span = hi-lo || Math.max(.01,Math.abs(hi)*.1);
  lo -= span*.12; hi += span*.12;
  const end = Math.max(Number.MIN_VALUE,...series.map(s=>s.points.at(-1).t));
  const x = t => pad.l + (t/(end || 1))*(W-pad.l-pad.r);
  const y = v => H-pad.b-(v-lo)/(hi-lo)*(H-pad.t-pad.b);
  let html = `<title>${esc(yLabel)} over time</title><desc>Use the time slider and the level ledger for exact values. All run data can be downloaded as CSV.</desc>`;
  for(let i=0;i<=4;i++) { const v=lo+(hi-lo)*i/4, t=end*i/4;
    html += `<path d="M${pad.l},${y(v)}H${W-pad.r}" stroke="#dce5df"/><text x="${pad.l-9}" y="${y(v)+4}" text-anchor="end">${f(v,3)}</text><text x="${x(t)}" y="${H-16}" text-anchor="middle">${f(t,1)}</text>`;
  }
  html += `<text x="${pad.l}" y="15">${esc(yLabel)}</text><text x="${W-pad.r}" y="${H-1}" text-anchor="end">Time [min]</text>`;
  if(run.case.disturbance !== 0 && run.case.disturbanceTime <= end) html += `<path d="M${x(run.case.disturbanceTime)},${pad.t}V${H-pad.b}" stroke="#a75043" stroke-dasharray="3 5"/><text x="${Math.min(W-105,x(run.case.disturbanceTime)+5)}" y="${pad.t+12}" fill="#a75043">disturbance on</text>`;
  for(const s of series) { const path = s.points.map((p,i)=>`${i?'L':'M'}${x(p.t).toFixed(2)},${y(p[s.key]).toFixed(2)}`).join(' ');
    html += `<path d="${path}" fill="none" stroke="${s.color || color[s.key]}" stroke-width="${s.key === 'h3' ? 3 : 2}" ${s.dash ? 'stroke-dasharray="7 5"' : ''}/>`;
  }
  html += `<path data-cursor d="M${pad.l},${pad.t}V${H-pad.b}" stroke="#142b2b" stroke-width="1.5" stroke-dasharray="2 3"/>`;
  svg.innerHTML=html; svg.dataset.end=end; svg.dataset.left=pad.l; svg.dataset.right=W-pad.r;
}
function drawCharts() {
  const levelSeries=['h1','h2','h3','sp'].map(key=>({key,points:run.points,dash:key==='sp'}));
  if(comparison && saved) levelSeries.push({key:'h3',points:saved.points,dash:true,color:'#677579'});
  plot($('levels-chart'),levelSeries,'Absolute level [m]');
  plot($('flow-chart'),['u','d','inflow'].map(key=>({key,points:run.points,dash:key==='d'})),'Flow [m³/min]');
}
function updateCursor() {
  const p=run.points[index]; $('time-slider').value=index;
  $('time-label').textContent=`t = ${f(p.t,2)} / ${f(run.points.at(-1).t,2)} min`;
  $('time-slider').setAttribute('aria-valuetext',`${f(p.t,2)} minutes; Tank 3 ${f(p.h3,4)} metres`);
  for(let i=1;i<=3;i++) {
    $(`tank${i}-level`).textContent=`${f(p['h'+i],3)} m`;
    const fill=$(`tank${i}-fill`); const percent=Math.max(0,Math.min(100,p['h'+i]/(2*run.case.level)*100));
    fill.style.height=`${percent}%`; fill.style.setProperty('--fill',`${percent}%`);
  }
  $('current-inflow').textContent=`${f(p.inflow,4)} m³/min`;
  $('ledger').innerHTML=[1,2,3].map(i=>`<tr><th scope="row">Tank ${i}</th><td>${f(p['h'+i],4)} m</td><td>${f(p['h'+i]-run.case.level,4)} m</td><td>${f(p['q'+i],4)} m³/min</td></tr>`).join('');
  for(const id of ['levels-chart','flow-chart']) { const svg=$(id), x=+svg.dataset.left+(+svg.dataset.right-svg.dataset.left)*p.t/svg.dataset.end; svg.querySelector('[data-cursor]').setAttribute('transform',`translate(${x-svg.dataset.left},0)`); }
  inspect(selectedUnit);
}
function inspect(unit) {
  selectedUnit=unit; const p=run.points[index],c=run.case,d=run.derived;
  const info={
    tank1:['Tank 1 · the first response',`The inlet is q̄ + u + d = ${f(p.inflow,4)} m³/min. Tank 1 stores liquid, so its level changes gradually. Its outflow drives Tank 2. τ dh₁′/dt = R(u + d) − h₁′.`],
    tank2:['Tank 2 · another lag',`Tank 2 receives Tank 1’s outflow. It adds a second delay in the response: τ dh₂′/dt = h₁′ − h₂′. Its current level is ${f(p.h2,4)} m.`],
    tank3:['Tank 3 · the measured outcome',`The controller watches this level: ${f(p.h3,4)} m. τ dh₃′/dt = h₂′ − h₃′. Three storage stages make the final response slow enough for a strong controller to overcorrect.`],
    setpoint:['Setpoint · the target',`SP = h̄ + ΔSP = ${f(c.level+c.setpoint,4)} m. This is a desired level, not an inlet flow. It changes at t = 0.`],
    disturbance:['Disturbance · extra flow after the controller',`d = ${f(p.d,4)} m³/min at this instant. This external flow enters Tank 1 in addition to the controller output, beginning at ${f(c.disturbanceTime)} min. The controller can react only after its effect reaches Tank 3.`],
    error:['Error · target minus measurement',`e = SP − h₃ = ${f(p.sp-p.h3,4)} m. The minus sign is negative feedback: when the level rises, the error and controller action decrease.`],
    controller:['Proportional controller · turn error into flow',`u = Kc e = ${f(p.u,4)} m³/min. Kc = ${f(c.gain,5)} m²/min; L = KcR = ${f(d.loopGain)} has no units. The steady inlet bias q̄ = ${f(c.flow)} m³/min is added separately.`],
    plant:['Plant · three tanks in series',`Gp(s) = R/(τs + 1)³ = ${f(d.R)}/(${f(d.tau)}s + 1)³. R converts flow into level; three first-order lags describe storage. Free-discharge outlets make the tanks noninteracting.`],
    sensor:['Ideal sensor · unity feedback',`Measured level equals actual Tank 3 level (${f(p.h3,4)} m). The model assumes no sensor lag, noise, or calibration error.`]
  };
  const [title,text]=info[unit] || info.tank3;
  $('inspector').innerHTML=`<strong>${title}</strong><p>${text}</p>`;
  document.querySelectorAll('[data-inspect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inspect===unit)));
}
$('case-form').addEventListener('submit',e=>{e.preventDefault();review(readCase());});
$('apply-case').addEventListener('click',()=>{prediction=$('prediction').value; const {c,isComparison}=pending; $('review-dialog').close(); apply(c,isComparison); play();});
$('edit-case').addEventListener('click',()=>$('review-dialog').close());
$('first-case').addEventListener('click',()=>{fillCase(DEFAULTS);review({...DEFAULTS});});
$('reset').addEventListener('click',()=>{prediction='unsure';$('prediction').value='unsure';showErrors({valid:true});apply({...DEFAULTS});});
$('preset').addEventListener('change',()=>{const c=readCase(),p=presets(c).find(p=>p.id===$('preset').value);if(p){$('gain').value=p.gain;$('run-summary').textContent='Draft gain changed. Review this case to apply it; charts still show the applied case.';}});
fields.forEach(key=>$(key).addEventListener('input',()=>{refreshPresets();$('run-summary').textContent='Draft values changed. Review this case to apply them; charts still show the applied case.';}));
document.querySelectorAll('[data-inspect]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.inspect)));
$('play').addEventListener('click',play); $('pause').addEventListener('click',pause);
$('rewind').addEventListener('click',()=>{pause();index=0;updateCursor();});
$('step').addEventListener('click',()=>{pause();index=Math.min(run.points.length-1,index+1);updateCursor();});
$('time-slider').addEventListener('input',()=>{pause();index=Math.round(Number($('time-slider').value));updateCursor();});
$('save-run').addEventListener('click',()=>{saved=run;comparison=false;$('compare-gain').value=f(7.5/run.derived.R,6);$('compare-run').disabled=false;$('compare-summary').textContent=`Saved run A: Kc ${f(saved.case.gain,5)}, L ${f(saved.derived.loopGain)}. Choose Kc for B; all other settings are locked to A.`;drawCharts();updateCursor();});
$('compare-run').addEventListener('click',()=>{if(saved) { const value=$('compare-gain').value; if(!value.trim() || !Number.isFinite(Number(value)) || Number(value)<0) {$('compare-summary').textContent='Built-in validation rule: comparison Kc must be a finite number at least 0. Enter a valid gain.';$('compare-gain').focus();return;} review({...saved.case,gain:Number(value)},true); }});
$('clear-compare').addEventListener('click',()=>{saved=undefined;comparison=false;$('compare-run').disabled=true;$('compare-summary').textContent='Comparison cleared. Save a run to compare again.';drawCharts();updateCursor();});
document.querySelectorAll('[data-exercise]').forEach(b=>b.addEventListener('click',()=>{let c={...DEFAULTS};if(b.dataset.exercise==='disturbance')c={...c,setpoint:0,disturbance:.02,duration:180};if(b.dataset.exercise==='gain')c={...c,gain:.75,duration:240};fillCase(c);review(c);}));
// Optional data export preserves the exact solver samples underlying every visual.
$('download-csv')?.addEventListener('click',()=>{const keys=['t','h1','h2','h3','sp','u','d','inflow'];const csv='time_min,h1_m,h2_m,h3_m,setpoint_m,controller_deviation_m3_min,disturbance_m3_min,total_inlet_m3_min\n'+run.points.map(p=>keys.map(k=>p[k]).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='three-tank-run.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
fillCase(DEFAULTS); apply({...DEFAULTS});
const baseline=simulate({...DEFAULTS}),bd=baseline.derived,bm=baseline.metrics;
$('worked-example').innerHTML=`<p>Kyle’s default: A = ${DEFAULTS.area} m², h̄ = ${DEFAULTS.level} m, q̄ = ${DEFAULTS.flow} m³/min, Kc = ${DEFAULTS.gain} m²/min, ΔSP = ${DEFAULTS.setpoint} m, d = 0, t = ${DEFAULTS.duration} min.</p><p>R = 2h̄/q̄ = <b>${f(bd.R)} min/m²</b>; τ = AR = <b>${f(bd.tau)} min</b>; L = KcR = <b>${f(bd.loopGain)}</b>; critical Kc = 8/R = <b>${f(bd.criticalGain)} m²/min</b>.</p><p>H₃/SP = ${f(bd.numerator)}/(${f(bd.denominator[0])}s³ + ${f(bd.denominator[1])}s² + ${f(bd.denominator[2])}s + ${f(bd.denominator[3])}). Final change = <b>${f(bm.steadyChange,6)} m</b>; final level = ${f(bm.steadyLevel,6)} m; offset = ${f(bm.offset,6)} m. The response overshoots its own final change by about ${f(bm.overshootPct,2)}%, yet remains below the 1.2 m setpoint. This is why “overshoot” and “crosses the setpoint” are separate measurements.</p><p>Independent inverse-Laplace check: peak h₃ = 1.1731528572 m at 33.59898775 min; h₃(120) = 1.1317034016 m. This finite-time endpoint is not the steady state. See the <a href="./docs/ORIGINAL-REVIEW.md">recorded baseline audit</a>.</p>`;

let resizeTimer; window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{drawCharts();updateCursor();},100);});
