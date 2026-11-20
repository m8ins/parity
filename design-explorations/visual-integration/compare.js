const screen = document.querySelector('#screen');
const pair = document.querySelector('#pair');
const size = document.querySelector('#size');
const container = document.querySelector('.comparisons');
function render() {
  container.innerHTML = [pair.value === 'orange' ? 'c' : 'a', pair.value].map(variant => `<section><h2>${({ a: 'A · Warmes Creme', b: 'B · Heller, neutraler', c: 'C · Sanftes Creme', orange: 'C + Orange · Signal für Aktionen' })[variant]}</h2><a href="screen.html?variant=${variant}&screen=${screen.value}" target="_blank" rel="noopener">Einzeln öffnen</a><div class="frame-box"><iframe title="Variante ${variant.toUpperCase()} – ${screen.selectedOptions[0].text}" src="screen.html?variant=${variant}&screen=${screen.value}"></iframe></div></section>`).join('');
  resize();
}
function resize() {
  document.querySelectorAll('.frame-box').forEach(box => {
    const width = size.value === 'mobile' ? 390 : 1280;
    const height = size.value === 'mobile' ? 844 : 960;
    const scale = Math.min(1, box.clientWidth / width);
    const frame = box.querySelector('iframe');
    Object.assign(frame.style, { width: `${width}px`, height: `${height}px`, transform: `scale(${scale})` });
    box.style.height = `${height * scale}px`;
  });
}
pair.addEventListener('change', render);
screen.addEventListener('change', render);
size.addEventListener('change', render);
window.addEventListener('resize', resize);
render();
