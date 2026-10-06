class Safe{constructor(s){this.s=s}}
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=v=>v==null||v===false?'':Array.isArray(v)?v.map(val).join(''):v instanceof Safe?v.s:esc(String(v));
/** Plantilla que escapa todo valor interpolado; los fragmentos anidados de html`` pasan sin escapar. */
export const html=(s,...v)=>new Safe(s.reduce((o,x,i)=>o+x+(i<v.length?val(v[i]):''),''));
export const toHtml=h=>h.s;
/** Minúsculas y sin acentos, para buscar "aglomeracion" y "aglomeración" por igual. */
export const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
