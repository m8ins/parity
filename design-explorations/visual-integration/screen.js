const params = new URLSearchParams(location.search);
const variant = ['a', 'b', 'c', 'orange'].includes(params.get('variant')) ? params.get('variant') : 'a';
const view = params.get('screen') || 'login';
document.documentElement.dataset.variant = variant;
const icon = type => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${type === 'electricity' ? '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>' : '<path d="M12 3c2 4-2 5 1 8 1-1 2-2 2-4 4 4 6 8 3 12a8 8 0 0 1-12-1C2 12 8 10 8 6c2 2 1 4 2 5 3-3 0-5 2-8Z"/>'}</svg>`;
const url = screen => `screen.html?variant=${variant}&screen=${screen}`;
const header = `<header><a class="brand" href="${url('overview')}">Parity</a>${view !== 'login' ? '<button class="quiet account" type="button">demo@parity.example <span aria-hidden="true">⌄</span></button>' : ''}</header>`;
function card(type, name, value, unit) {
  return `<article class="meter surface"><div class="meter-title">${icon(type)}<h2>${name}</h2><button class="quiet menu" aria-label="${name} verwalten">•••</button></div><div class="reading-summary"><p>Letzter Zählerstand</p><strong class="reading numeric">${value} <small>${unit}</small></strong><p>Abgelesen am <time datetime="2026-10-15">15.10.2026</time></p></div><div class="forecast"><p><strong>Noch keine Prognose</strong></p><p>Für eine Schätzung brauchen wir mindestens zwei Ablesungen im gewählten Abrechnungszeitraum.</p></div><p class="meta">1 Ablesung · Stadtwerke Beispiel</p><a class="button primary" href="${url('dialog')}"><span aria-hidden="true">+</span> Stand erfassen</a></article>`;
}
const overview = `<main class="overview"><h1>Deine Zähler</h1><p>Zähler finden, Stand erfassen und Ablesungen im Blick behalten.</p><div class="meter-grid">${card('electricity', 'Strom · Keller', '24.398,2', 'kWh')}${card('gas', 'Gas · Keller', '8.421,365', 'm³')}<button class="add-meter"><span aria-hidden="true">+</span><strong>Zähler hinzufügen</strong><span>Strom oder Gas erfassen</span></button></div></main>`;
const login = `<main class="login"><section class="surface auth"><h1>Bei Parity anmelden</h1><p>Deine Zähler und Ablesungen im Blick.</p><div class="tabs" role="group" aria-label="Anmeldeverfahren"><button data-method="code" aria-pressed="true">E-Mail-Code</button><button data-method="password" aria-pressed="false">Passwort</button></div><form><label for="email">E-Mail-Adresse</label><input id="email" name="email" type="email" autocomplete="email" value="demo@parity.example" required><div id="password-group" hidden><label for="password">Passwort</label><input id="password" type="password" autocomplete="current-password"></div><p class="support" id="method-hint">Du erhältst einen Anmeldecode per E-Mail.</p><button class="primary" type="submit" id="login-action">Code anfordern</button><p class="support" role="status" id="login-status"></p></form></section></main>`;
const modal = `<div class="overlay"><section class="reading-dialog surface" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-context"><div class="handle" aria-hidden="true"><span></span></div><div class="dialog-scroll"><h2 id="dialog-title">Zählerstand erfassen</h2><p id="dialog-context">Strom · Keller · kWh</p><form class="reading-form"><div><label for="date">Ablesedatum</label><input id="date" type="date" value="2026-11-15"></div><div><label for="reading">Neuer Zählerstand (kWh)</label><div class="reading-row"><input id="reading" class="numeric" inputmode="decimal" value="24.681,7" aria-describedby="reading-hint"><strong>kWh</strong></div><p class="support" id="reading-hint">Den Stand in kWh ablesen. Nachkommastellen mit Komma eingeben.</p></div><div class="last-reading support"><span>Zuletzt · 15.10.2026</span><strong class="numeric">24.398,2 kWh</strong></div><button class="primary" type="submit">Zählerstand speichern</button><a class="button quiet" href="${url('overview')}">Abbrechen</a><p class="support" role="status" id="save-status" hidden></p></form></div></section></div>`;
document.querySelector('#app').innerHTML = header + (view === 'login' ? login : overview) + (view === 'dialog' ? modal : '') + '<aside class="fixture-note">Gestaltungsvorschau · synthetische Daten</aside>';
if (view === 'login') {
  document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
    const password = button.dataset.method === 'password';
    document.querySelectorAll('[data-method]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    document.querySelector('#password-group').hidden = !password;
    document.querySelector('#password').required = password;
    document.querySelector('#method-hint').textContent = password ? 'Melde dich mit deinem bestehenden Passwort an.' : 'Du erhältst einen Anmeldecode per E-Mail.';
    document.querySelector('#login-action').textContent = password ? 'Anmelden' : 'Code anfordern';
  }));
  document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#login-status').textContent = 'Nur Vorschau: Es wird keine Anmeldung ausgelöst.'; });
}
if (view === 'dialog') {
  document.querySelector('.reading-form').addEventListener('submit', event => { event.preventDefault(); const status = document.querySelector('#save-status'); status.hidden = false; status.textContent = 'Nur Vorschau: Es werden keine Daten gespeichert.'; });
  document.querySelector('header').inert = true;
  document.querySelector('.overview').inert = true;
}
