import {html,toHtml} from './util.js';
import {buildIndex,KIND} from './search.js';

const FEEDBACK_URL=''; // Pegar acá el enlace al formulario "¿No encontraste lo que buscabas?". Vacío = no se muestra.
const REVISION=new URLSearchParams(location.search).has('revision'); // ?revision=1 resalta vacíos y datos dudosos
const SOURCE={default:'Por defecto',propuesta:'Propuesta: validar',manual:'Manual',pendiente:'Pendiente'};
const ROLE={principal:'Principal',alternativa:'Alternativa',complementaria:'Complementaria',verificacion:'Verificación',opcional:'Opcional','verificación':'Verificación'};
const FILTERS=[['all','Todo','Todas las categorías juntas.'],
  ['situacion','Situaciones','Describí lo que querés resolver y te mostramos qué analíticas usar.'],
  ['analitica','Analíticas','Las funciones de detección de UltraIP.'],
  ['parametro','Parámetros','Cada campo que se completa al configurar una analítica.']];
const NO_INFO='Todavía no hay información cargada para este parámetro.';

const app=document.querySelector('[data-app]');
const state={q:'',filter:'all'};
let D,am,pm,sm,idx;

const href=(t,id)=>`#/${t}/${id}`;
const back=html`<a class="back" href="#/">← Volver a la búsqueda</a>`;
const badge=t=>html`<span class="badge" data-kind="${t}">${KIND[t]}</span>`;
const render=(h,title)=>{app.innerHTML=toHtml(h);document.title=`${title} | Asistente de Analíticas`;window.scrollTo(0,0);app.focus({preventScroll:true})};
const review=n=>REVISION&&n&&n.length?html`<div class="review"><strong>Para revisar:</strong><ul>${n.map(x=>html`<li>${x}</li>`)}</ul></div>`:'';
const names=(es,en)=>html`<span class="term-es">${es}</span>${en&&html`<span class="term-en" lang="en">${en}</span>`}`;
const pills=(t,list)=>html`<ul class="pills">${list.map(x=>html`<li><a class="pill" href="${href(t,x.id)}">${x.nameEs||x.titleEs}</a></li>`)}</ul>`;

/* ---------- Inicio ---------- */
function home(){
  render(html`<h2>¿Qué querés resolver?</h2>
  <p class="lead">Escribí lo que necesitás, en castellano o en inglés, o elegí una categoría.</p>
  <form role="search"><label class="visually-hidden" for="q">Buscar situación, analítica o parámetro</label>
  <input class="search" id="q" type="search" autocomplete="off" value="${state.q}" placeholder="Por ejemplo: motos sobre vereda, aforo, line crossing"></form>
  <fieldset class="filters"><legend class="visually-hidden">Categoría</legend>
  ${FILTERS.map(([k,l])=>html`<button type="button" class="chip" data-filter="${k}">${l} (${k==='all'?idx.items.length:idx.items.filter(i=>i.type===k).length})</button>`)}</fieldset>
  <p class="help" data-help></p><p class="status" data-status role="status"></p><div data-results></div>${REVISION?revisionPanel():''}`,'Inicio');
  update();
}
const resultItem=h=>html`<li><a class="card" data-kind="${h.type}" href="${href(h.type,h.id)}">
  <span class="badge">${KIND[h.type]}</span>
  <span class="card-body">${names(h.es,h.en)}${h.type==='situacion'&&html`<span class="meta">Analíticas: ${sm[h.id].recommended.map(r=>am[r.analyticId].nameEs).join(', ')}</span>`}</span>
  <span aria-hidden="true">→</span></a></li>`;
function update(){
  const q=state.q.trim(), hits=q?idx.search(q):idx.items;
  const types=state.filter==='all'?['situacion','analitica','parametro']:[state.filter];
  const groups=types.map(t=>[t,hits.filter(h=>h.type===t)]).filter(([,l])=>l.length);
  const shown=groups.reduce((n,[,l])=>n+l.length,0), others=hits.length-shown;
  app.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
  app.querySelector('[data-help]').textContent=FILTERS.find(f=>f[0]===state.filter)[2];
  app.querySelector('[data-status]').innerHTML=toHtml(html`${q?`${shown} resultado${shown===1?'':'s'}. `:''}${others>0&&html`Hay ${others} más en otras categorías. <button type="button" class="link" data-filter="all">Verlos en Todo</button>`}`);
  app.querySelector('[data-results]').innerHTML=toHtml(shown?html`${groups.map(([t,l])=>html`<h3>${{situacion:'Situaciones',analitica:'Analíticas',parametro:'Parámetros'}[t]} (${l.length})</h3><ul class="stack">${l.map(resultItem)}</ul>`)}`
   :html`<p class="desc">No encontramos “${q}”. Probá con otras palabras, en castellano o en inglés, o elegí una situación:</p>${pills('situacion',D.situations.slice(0,4))}
   ${FEEDBACK_URL&&html`<p class="meta"><a class="link" href="${FEEDBACK_URL}" target="_blank" rel="noopener">¿No encontraste lo que buscabas? Contanos qué buscabas</a></p>`}`);
}
function revisionPanel(){
  const notes=[...D.analytics.map(a=>[a.nameEs,a.reviewNotes||[]]),...D.parameters.map(p=>[p.nameEs,[...(p.reviewNotes||[]),...(p.pending?['Pendiente de información']:[])]])].filter(([,n])=>n.length);
  const gaps=D.analytics.filter(a=>!a.hardwareNotes).length;
  return html`<section class="panel warn"><h3>Modo revisión</h3><p>${gaps} analíticas sin nota de cámara y ${D.analytics.filter(a=>!a.useCases.length).length} sin casos de uso. Notas para revisar:</p>
  <ul>${notes.map(([n,l])=>html`<li><strong>${n}:</strong> ${l.join(' ')}</li>`)}</ul></section>`;
}

/* ---------- Detalle ---------- */
const paramCard=(p,a)=>{const def=(a&&a.paramDefaults&&a.paramDefaults[p.id])||p.defaultValue;
  return html`<li><a class="card" data-kind="parametro" href="${href('parametro',p.id)}"><span class="card-body">${names(p.nameEs,p.nameEn)}
  ${def&&html`<span class="meta">Valor por defecto: ${def}</span>`}<span class="meta">${p.interpretationEs||NO_INFO}</span></span><span aria-hidden="true">→</span></a></li>`};
function analyticView(a){
  const ps=a.parameters.map(i=>pm[i]).filter(Boolean), own=ps.filter(p=>!p.isCommon), com=ps.filter(p=>p.isCommon);
  const sits=D.situations.filter(s=>s.recommended.some(r=>r.analyticId===a.id));
  render(html`<article>${back}<header class="head">${badge('analitica')}${a.forenseOnly&&html`<span class="tag">Solo forense</span>`}
  <p class="cat">${a.category}</p><h2>${a.nameEs}</h2><span class="term-en" lang="en">${a.nameEn}</span></header>
  <p class="desc">${a.descriptionEs}</p>
  ${a.forenseOnly&&html`<div class="panel warn"><p>Esta analítica se usa para buscar sobre grabaciones; no genera alertas en tiempo real.</p></div>`}
  <div class="panel warn"><h3>Qué tener en cuenta en la cámara</h3><p>${a.hardwareNotes||'Todavía no hay una nota específica. Valen las generales: cámara fija y entre 4 y 8 FPS.'}</p></div>
  ${a.useCases.length>0&&html`<h3>Casos de uso</h3><ul>${a.useCases.map(u=>html`<li>${u}</li>`)}</ul>`}
  ${sits.length>0&&html`<h3>Situaciones donde se usa</h3>${pills('situacion',sits)}`}
  <h3>Qué tenés que completar (${own.length})</h3><ul class="stack">${own.map(p=>paramCard(p,a))}</ul>
  <details><summary>Parámetros comunes a casi todas las analíticas (${com.length})</summary><ul class="stack">${com.map(p=>paramCard(p,a))}</ul></details>
  <p class="meta">Para seguir leyendo: ${a.manualSection}.</p>${review(a.reviewNotes)}</article>`,a.nameEs);
}
function paramView(p){
  const used=D.analytics.filter(a=>a.parameters.includes(p.id)), parent=p.belongsToFilter&&pm[p.belongsToFilter];
  const row=(t,v)=>v&&html`<dt>${t}</dt><dd>${v}</dd>`;
  render(html`<article>${back}<header class="head">${badge('parametro')}<h2>${p.nameEs}</h2><span class="term-en" lang="en">${p.nameEn}</span></header>
  <p class="desc">${p.interpretationEs||NO_INFO}</p>
  <dl class="fields">${row('Valor por defecto',p.defaultValue)}${row('Máximo',p.maxValue)}${row('Si lo subís',p.effectIfHigher)}${row('Si lo bajás',p.effectIfLower)}${row('Nota',p.sourceNote)}
  ${parent&&html`<dt>Pertenece a</dt><dd><a class="link" href="${href('parametro',parent.id)}">${parent.nameEs}</a></dd>`}</dl>
  <h3>Analíticas donde aparece (${used.length})</h3>${pills('analitica',used)}${review(p.reviewNotes)}</article>`,p.nameEs);
}
function situationView(s){
  const rows=l=>html`<div class="scroll"><table><caption class="visually-hidden">Valores iniciales</caption><thead><tr><th>Parámetro</th><th>Valor inicial</th><th>Origen</th></tr></thead><tbody>
  ${l.map(q=>html`<tr><td>${q.label||html`<a class="link" href="${href('parametro',q.id)}">${pm[q.id].nameEs}</a>`}</td><td>${q.value}</td><td><span class="src" data-src="${q.valueSource}">${SOURCE[q.valueSource]}</span></td></tr>`)}</tbody></table></div>`;
  render(html`<article>${back}<header class="head">${badge('situacion')}<p class="cat">${s.category}</p><h2>${s.titleEs}</h2><span class="term-en" lang="en">${s.titleEn}</span></header>
  <p class="desc">${s.descriptionEs}</p>
  <div class="panel warn"><h3>Certeza: ${s.certainty}</h3><p>${s.certaintyNote}</p></div>
  <details><summary>Base común a todas las situaciones</summary>${rows(D.common)}</details>
  <h3>Analíticas recomendadas</h3>
  ${s.recommended.map(r=>{const a=am[r.analyticId];return html`<section class="panel"><p class="role">${ROLE[r.role]||r.role}${a.forenseOnly&&html` · <span class="tag">Solo forense</span>`}</p>
   <h4><a class="link" href="${href('analitica',a.id)}">${a.nameEs}</a> <span class="term-en" lang="en">${a.nameEn}</span></h4>
   ${r.note&&html`<p>${r.note}</p>`}${r.params.length>0&&rows(r.params)}</section>`})}
  ${s.keyParams&&html`<h3>Parámetros clave</h3><ul class="stack">${s.keyParams.map(i=>paramCard(pm[i]))}</ul>`}</article>`,s.titleEs);
}

/* ---------- Rutas y arranque ---------- */
const VIEWS={analitica:[()=>am,analyticView],parametro:[()=>pm,paramView],situacion:[()=>sm,situationView]};
function route(){
  const [,t,id]=location.hash.split('/'), v=VIEWS[t], item=v&&v[0]()[decodeURIComponent(id||'')];
  if(item)v[1](item);
  else if(!t)home();
  else render(html`${back}<h2>No encontramos esa página</h2><p class="desc">El enlace puede estar desactualizado. Volvé a la búsqueda para encontrar lo que necesitás.</p>`,'No encontrada');
}
app.addEventListener('input',e=>{if(e.target.matches('.search')){state.q=e.target.value;update()}});
app.addEventListener('submit',e=>e.preventDefault());
app.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){state.filter=b.dataset.filter;update()}});
window.addEventListener('hashchange',route);

const load=n=>fetch(`data/${n}.json`).then(r=>{if(!r.ok)throw new Error(n);return r.json()});
Promise.all([load('analytics'),load('parameters'),load('situations')]).then(([analytics,parameters,sit])=>{
  D={analytics,parameters,situations:sit.items,common:sit.common};
  am=Object.fromEntries(analytics.map(x=>[x.id,x]));pm=Object.fromEntries(parameters.map(x=>[x.id,x]));sm=Object.fromEntries(D.situations.map(x=>[x.id,x]));
  idx=buildIndex(D);route();
}).catch(()=>{app.innerHTML=toHtml(html`<h2>No se pudieron cargar los datos</h2><p class="desc">Si abriste el archivo con doble clic, el navegador lo bloquea. Abrilo desde un servidor local (ver LEEME.md) o desde la dirección publicada.</p>`)});
