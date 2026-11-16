/* Standalone exploration. No APIs, storage, analytics, or application imports. */
const fixtures = {
  electricity: { name: 'Strom · Keller', id: '1 EMH 0012 3456', unit: 'kWh', value: '24.681,7', last: '24.398,2', precision: 1, hint: 'Eine Nachkommastelle ablesen. Zum Beispiel 24.681,7.' },
  gas: { name: 'Gas · Hausanschluss', id: 'G4 9826 1540', unit: 'm³', value: '8.412,365', last: '8.351,042', precision: 3, hint: 'Drei Nachkommastellen ablesen. Zum Beispiel 8.412,365.' }
};
const variants = [
  { id: 'a', name: 'Atkinson Hyperlegible Next', detail: 'Kantige Taste · 4 px Hub', note: 'Offene Buchstabenformen, deutlich unterscheidbare Zeichen. Die kompakte Taste hat eine gerade Unterkante und kurze Drucktiefe.' },
  { id: 'b', name: 'Nunito Sans', detail: 'Runde Taste · 7 px Hub', note: 'Weichere Formen und ein ruhiger, breiterer Schriftfluss. Die stärker gerundete Taste steht höher und gibt beim Drücken weiter nach.' }
];
const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
// Text inputs match native :focus-visible even after a click. Track navigation
// modality explicitly for the agreed pointer/keyboard distinction in fields.
document.documentElement.dataset.inputModality = 'keyboard';
document.addEventListener('pointerdown', () => {document.documentElement.dataset.inputModality = 'pointer';}, true);
document.addEventListener('keydown', event => {
  if(event.key === 'Tab') document.documentElement.dataset.inputModality = 'keyboard';
}, true);
let currentMeter = 'electricity';
let timers = [];
const params = new URLSearchParams(location.search);
if (params.get('meter') === 'gas') currentMeter = 'gas';
let currentView = params.get('view') || 'a';
document.body.dataset.view = currentView;
document.querySelector('#meter').value = currentMeter;
function render() {
  timers.forEach(clearTimeout); timers = [];
  const f = fixtures[currentMeter];
  document.querySelector('#comparison').innerHTML = variants.map(v => `
    <section class="variant variant-${v.id}" aria-labelledby="title-${v.id}">
      <div class="variant-heading"><h2 id="title-${v.id}">Variante ${v.id.toUpperCase()}</h2><span>${v.detail}</span></div>
      <div class="device">
        <div class="device-top"><span class="brand">parity</span><span>Dein Zähler, dein Überblick.</span></div>
        <a class="back" href="#meter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>Zu den Zählern</a>
        <h3>Zählerstand erfassen</h3>
        <div class="meter-context"><span class="meter-symbol"><svg viewBox="0 0 24 24" aria-hidden="true">${currentMeter === 'gas' ? '<path d="M12 3c1 5 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 4 2 4 2-3 1-6 1-9Z"/>' : '<path d="m13 2-8 12h6l-1 8 9-13h-7Z"/>'}</svg></span><div><strong>${f.name}</strong><small>Zählernummer ${f.id}</small></div></div>
        <form novalidate data-variant="${v.id}">
          <label for="date-${v.id}">Ablesedatum</label>
          <input class="date" id="date-${v.id}" name="date" inputmode="numeric" value="15.11.2026" aria-describedby="date-error-${v.id}" autocomplete="off">
          <p class="field-error" id="date-error-${v.id}"></p>
          <label for="value-${v.id}">Neuer Zählerstand <span class="sr-unit">(${f.unit})</span></label>
          <div class="value-wrap"><input class="number" id="value-${v.id}" name="value" type="text" inputmode="decimal" value="${f.value}" aria-describedby="hint-${v.id} value-error-${v.id}" autocomplete="off" spellcheck="false"><span class="unit" aria-hidden="true">${f.unit}</span></div>
          <p class="field-error" id="value-error-${v.id}"></p>
          <p class="hint" id="hint-${v.id}">${f.hint}</p>
          <div class="last-reading"><span>Zuletzt · 15.10.2026</span><strong class="number">${f.last} ${f.unit}</strong></div>
          <button class="primary" type="submit">${checkIcon}<span>Zählerstand speichern</span></button>
          <p class="message" role="status" aria-live="polite"></p>
        </form>
      </div>
      <p class="variant-note"><strong>${v.name}.</strong> ${v.note}</p>
    </section>`).join('');
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', event => {event.preventDefault();save(form);});
    form.addEventListener('input', () => {
      if(form.getAttribute('aria-busy') === 'true') return;
      form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
      setMessage(form, '');
      const button = form.querySelector('.primary'); button.disabled = false; button.innerHTML = `${checkIcon}<span>Zählerstand speichern</span>`;
    });
  });
  document.querySelectorAll('.back').forEach(link => link.addEventListener('click', () => document.querySelector('#meter').focus()));
}
function setMessage(form, text, type = '') {const el=form.querySelector('.message');el.className=`message ${type}`;el.textContent=text;}
function setInvalid(form, field, message) {
  const input = form.elements[field]; input.setAttribute('aria-invalid','true');
  form.querySelector(`#${field}-error-${form.dataset.variant}`).textContent = message;
}
function validate(form) {
  const f=fixtures[currentMeter], value=form.elements.value.value.trim();
  const pattern=new RegExp(`^(?:\\d+|\\d{1,3}(?:\\.\\d{3})+)(?:,\\d{1,${f.precision}})?$`);
  let valid=true;
  if(!pattern.test(value) || Number(value.replaceAll('.','').replace(',','.')) > 999999.999) {
    setInvalid(form,'value',value ? `Bitte als deutsche Zahl eingeben, z. B. ${f.value} (höchstens ${f.precision} Nachkommastelle${f.precision>1?'n':''}).` : 'Bitte den Zählerstand eingeben.'); valid=false;
  }
  const match=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(form.elements.date.value);
  const date=match ? new Date(Date.UTC(+match[3],+match[2]-1,+match[1])) : null;
  if(!match || date.toISOString().slice(0,10)!==`${match[3]}-${match[2]}-${match[1]}` || date > new Date('2026-11-15T00:00:00Z')) {
    setInvalid(form,'date','Bitte ein gültiges Datum bis zum 15.11.2026 eingeben.');valid=false;
  }
  if(!valid){setMessage(form,'Bitte die markierten Angaben prüfen.','error');form.querySelector('[aria-invalid=true]').focus();}
  return valid;
}
function save(form) {
  if(!validate(form))return;
  const button=form.querySelector('.primary');button.disabled=true;button.textContent='Wird gespeichert …';form.setAttribute('aria-busy','true');
  form.elements.date.readOnly=true;form.elements.value.readOnly=true;
  setMessage(form,'Speichern wird lokal simuliert …');
  timers.push(setTimeout(()=>{form.removeAttribute('aria-busy');showSaved(form);},1000));
}
function showSaved(form) {
  form.elements.date.readOnly=false;form.elements.value.readOnly=false;
  const f=fixtures[currentMeter];const value=Number(form.elements.value.value.replaceAll('.','').replace(',','.'));
  const formatted=new Intl.NumberFormat('de-DE',{minimumFractionDigits:f.precision,maximumFractionDigits:f.precision}).format(value);
  form.querySelector('.primary').disabled=true;form.querySelector('.primary').innerHTML=`${checkIcon}<span>Gespeichert</span>`;
  setMessage(form,`✓ ${formatted} ${f.unit} · ${form.elements.date.value}. In dieser Vorschau gespeichert; nach Neuladen zurückgesetzt.`,'success');
}
function applyState(state) {
  render();
  document.querySelectorAll('form').forEach(form=>{
    const button=form.querySelector('.primary');
    if(state==='focus')button.classList.add('demo-focus');
    if(state==='active')form.querySelector('.value-wrap').classList.add('demo-active');
    if(state==='input-focus')form.querySelector('.value-wrap').classList.add('demo-input-focus');
    if(state==='pressed')button.classList.add('demo-pressed');
    if(state==='empty')form.elements.value.value='';
    if(state==='invalid'){form.elements.value.value='24,68,7';setInvalid(form,'value',`Bitte nur ein Dezimalkomma verwenden, z. B. ${fixtures[currentMeter].value}.`);setMessage(form,'Bitte die markierte Zahl prüfen.','error');}
    if(state==='saving'){form.elements.date.readOnly=true;form.elements.value.readOnly=true;button.disabled=true;button.textContent='Wird gespeichert …';form.setAttribute('aria-busy','true');setMessage(form,'Speichern wird lokal simuliert …');}
    if(state==='saved')showSaved(form);
    if(state==='failure'){setMessage(form,'! Nicht gespeichert. Deine Eingabe bleibt erhalten. Bitte erneut versuchen.','error');button.innerHTML=`${checkIcon}<span>Erneut speichern</span>`;}
  });
}
document.querySelector('#meter').addEventListener('change',e=>{currentMeter=e.target.value;applyState(document.querySelector('#state').value);});
document.querySelector('#state').addEventListener('change',e=>applyState(e.target.value));
document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#state').value='ready';render();});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{currentView=button.dataset.view;document.body.dataset.view=currentView;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===currentView)));
const rows=[['Zählerstand','7,2 kWh'],['Zählerstand','24.681,7 kWh'],['Zählerstand','999.999,9 kWh'],['Zählerstand','8.412,365 m³'],['Zählerstand','999.999,999 m³'],['Erstattung','−127,45 €'],['Arbeitspreis','31,82 ct/kWh']];
document.querySelector('#specimens').innerHTML=variants.map(v=>`<div class="type-sample variant-${v.id}"><h3>${v.id.toUpperCase()} · ${v.name}</h3><table aria-label="Zahlenprobe ${v.name}"><tbody>${rows.map(([label,value],i)=>`<tr><th scope="row">${label}</th><td style="font-weight:${[400,600,700][i%3]}">${value}</td></tr>`).join('')}</tbody></table><p class="glyphs">0O · 1lI · 0123456789</p><p>Ablesung · Zähler · Größe · Überprüfen</p></div>`).join('');
render();
if(params.has('state')){document.querySelector('#state').value=params.get('state');applyState(params.get('state'));}
window.fontChecks=[];
document.fonts.ready.then(()=>{
  for(const family of ['Atkinson','Nunito'])for(const weight of [400,600,700]){
    const span=document.createElement('span');span.style.cssText=`position:absolute;visibility:hidden;font-family:${family};font-size:40px;font-weight:${weight};font-variant-numeric:lining-nums tabular-nums;`;
    document.body.append(span);const widths=[...'0123456789'].map(d=>{span.textContent=d.repeat(10);return span.getBoundingClientRect().width/10;});span.remove();
    window.fontChecks.push({family,weight,loaded:document.fonts.check(`${weight} 40px ${family}`),widths,tabular:Math.max(...widths)-Math.min(...widths)<.01});
  }
  document.querySelector('#font-result').textContent=window.fontChecks.every(x=>x.loaded&&x.tabular)?'Browserprüfung bestanden: beide lokalen Schriften haben in allen drei Gewichten gleich breite Ziffern.':'Schriftprüfung fehlgeschlagen – Details in der Browserkonsole.';
});
