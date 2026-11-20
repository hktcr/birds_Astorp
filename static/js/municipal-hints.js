/* Seasonal hints exclude the municipality's observed species, not the personal checklist. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./predictions.js'),require('./stockholm-dates.js'));
 else root.MunicipalHints=factory(root.AstorpPredictions,root.StockholmDates);
})(typeof window==='undefined'?this:window,function(predictions,dates){
 'use strict';
 function rank(municipal,year,guide,daily,taxonomy,now){
  const today=dates.stockholmDay(now);
  if(!municipal||!municipal.source||municipal.source.complete!==true||!Array.isArray(municipal.records))throw Error('Komplett kommununderlag saknas.');
  if(!today||Number(today.slice(0,4))!==year||municipal.source.toDay!==today)throw Error('Tips visas när kommunens årslista är uppdaterad för idag.');
  if(!taxonomy||taxonomy.version!=='AviList v2026'||!taxonomy.species||!taxonomy.verifiedAliases||!taxonomy.verifiedSourceParents)throw Error('Artmappningen kan inte verifieras.');
  const explicitParents={'Corvus corone cornix':'205976','Columba livia, domesticated populations':'102970'};
  function identity(latin){
   const parentId=explicitParents[latin],parent=parentId&&taxonomy.verifiedSourceParents[parentId];
   if(parentId&&!parent)throw Error('Artmappning saknas.');
   const full=parent?parent.scientificName:latin;
   const canonical=taxonomy.verifiedAliases[full]||full;
   if(!Object.hasOwn(taxonomy.species,canonical))throw Error('Artmappning saknas.');
   return taxonomy.species[canonical];
  }
  const seen=new Map();
  municipal.records.forEach(r=>{if(r.day.startsWith(year+'-')&&r.day<=today)seen.set(identity(r.scientificName),r.day);});
  const guideIds=new Set(),observations=[];
  guide.species.forEach(sp=>{
   const id=identity(sp.latin);
   if(guideIds.has(id))throw Error('Artguiden har överlappande arter.');
   guideIds.add(id);
   const day=seen.get(id);
   if(day)observations.push({species:sp.name,date:day});
  });
  return predictions.rank({year,observations},guide,daily,now);
 }
 return {rank};
});
