// Optional offline-only preview: the published GitHub Action replaces this preview with complete IMDb data.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,OUT=path.join(ROOT,'docs');
const names=fs.readFileSync(path.join(ROOT,'data/directors.txt'),'utf8').trim().split(/\r?\n/);
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const write=(rel,obj)=>{const full=path.join(OUT,rel);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(obj))};
const entries=names.map((name,i)=>({name,bookNumber:i+1,slug:slug(name),count:0,firstYear:null,lastYear:null}));
// Titles and IDs are authentic Hitchcock films; ratings deliberately not invented for this offline preview.
const films=[
['Family Plot','tt0074512',1976],['Frenzy','tt0068611',1972],['Topaz','tt0065112',1969],
['Torn Curtain','tt0061107',1966],['Marnie','tt0058329',1964],['The Birds','tt0056869',1963],
['Psycho','tt0054215',1960],['North by Northwest','tt0053125',1959],['Vertigo','tt0052357',1958],
['The Wrong Man','tt0051207',1956],['The Man Who Knew Too Much','tt0049470',1956],
['To Catch a Thief','tt0048728',1955],['Rear Window','tt0047396',1954],['Dial M for Murder','tt0046912',1954],
['I Confess','tt0045897',1953],['Strangers on a Train','tt0044079',1951],['Rope','tt0040746',1948],
['Notorious','tt0038787',1946],['Lifeboat','tt0037017',1944],['Shadow of a Doubt','tt0036342',1943],['Rebecca','tt0032976',1940]
].map(([name,id,year])=>({name,id,year,rating:null,votes:null,genres:[],runtimeMinutes:null}));
const hitchcock=entries.find(e=>e.name==='Alfred Hitchcock');hitchcock.count=films.length;hitchcock.firstYear=1940;hitchcock.lastYear=1976;
write('directors.json',{updated:null,total:501,preview:true,directors:entries});
write(`films/${hitchcock.slug}.json`,{name:hitchcock.name,preview:true,films});
// Keep the original 501-entry book order, starting at Georges Méliès.
const ordered=entries.map(e=>e.name);
write('manifest.json',{id:'community.501moviedirectors',version:'1.0.1',name:'501 Movie Directors',description:'Feature films and TV films (no shorts, music videos or TV shows), in book order. Run the GitHub Action to populate all directors.',resources:['catalog'],types:['movie'],idPrefixes:['tt'],catalogs:[{type:'movie',id:'501-directors',name:'501 Movie Directors',genres:ordered,extra:[{name:'genre',options:ordered,isRequired:true},{name:'skip'}]}]});
const meta=films.map(f=>({id:f.id,type:'movie',name:f.name,poster:`https://images.metahub.space/poster/medium/${f.id}/img`,releaseInfo:String(f.year)}));
write(`catalog/movie/501-directors/genre=Alfred Hitchcock.json`,{metas:meta});
console.log('Wrote offline website preview; run build.js to fetch and publish all 501 movie filmographies.');
