const status = document.getElementById('runtime-status');
const failure = document.getElementById('load-error');
document.getElementById('retry-load')?.addEventListener('click', () => location.reload());
try {
  await import('./app.js');
  status.textContent = 'Ready · calculated on your device';
} catch (error) {
  status.textContent = 'Simulator unavailable';
  failure.hidden = false;
  failure.querySelector('p').textContent = 'The calculation module could not load. Check your connection, then retry. For a downloaded copy, serve this folder with python3 -m http.server 8000 and open http://localhost:8000 (opening the HTML file directly does not load modules). The theory below remains available.';
  document.querySelectorAll('#case-form button, #play, #pause, #step, #rewind, #first-case, #save-run, #compare-run').forEach(button => button.disabled = true);
  console.error('Three Tank Lab initialization failed', error);
}
