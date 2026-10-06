import {norm} from './util.js';
export const KIND={analitica:'Analítica',parametro:'Parámetro',situacion:'Situación'};
/** Une los tres archivos en una lista plana de entradas buscables. */
export function buildIndex({analytics,parameters,situations}){
  const entry=(type,x,es,en,aliases,desc)=>({type,id:x.id,es,en,al:norm(aliases.join(' ')),
    n:{es:norm(es),en:norm(en),al:norm(aliases.join(' ')),desc:norm(desc)}});
  const items=[
    ...situations.map(x=>entry('situacion',x,x.titleEs,x.titleEn,[...x.keywordsEs,...x.keywordsEn],x.descriptionEs)),
    ...analytics.map(x=>entry('analitica',x,x.nameEs,x.nameEn,[...x.aliasesEs,...x.aliasesEn],`${x.descriptionEs} ${x.useCases.join(' ')} ${x.category}`)),
    ...parameters.map(x=>entry('parametro',x,x.nameEs,x.nameEn,[],x.interpretationEs||''))];
  const fuse=new Fuse(items,{threshold:.3,ignoreLocation:true,minMatchCharLength:2,
    keys:[{name:'n.es',weight:.35},{name:'n.en',weight:.35},{name:'n.al',weight:.3},{name:'n.desc',weight:.1}]});
  return {items,search:q=>fuse.search(norm(q)).map(r=>r.item)};
}
