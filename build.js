// 501 Movie Directors — static, catalogue-only Stremio add-on.
// Data: official IMDb non-commercial datasets (https://www.imdb.com/interfaces/).
// Requirements: Node 22+, no packages, no API key, no server.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const readline = require('node:readline');
const { once } = require('node:events');

const ROOT = __dirname;
const OUT = path.resolve(process.env.OUT_DIR || path.join(ROOT, 'docs'));
const DATASET_URL = 'https://datasets.imdbws.com/';
const names = fs.readFileSync(path.join(ROOT, 'data', 'directors.txt'), 'utf8').trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
if (names.length !== 501 || new Set(names).size !== 501) throw Error(`Expected 501 unique book entries, got ${names.length}`);
const entries = names.map((name, idx) => ({ name, bookNumber: idx + 1, slug: slug(name), members: name.split(' & '), films: [] }));
const nowYear = new Date().getUTCFullYear();
const PAGE = 100;
const REPO = process.env.GITHUB_REPOSITORY || 'momoneymoproblemo/501-movie-directors';
const BASE = (process.env.PUBLIC_BASE || `https://${REPO.split('/')[0]}.github.io/${REPO.split('/')[1]}`).replace(/\/$/, '');

function slug(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
}
function norm(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]/g,'');
}
function writeJSON(rel, object) {
  const file = path.join(OUT, rel); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(object));
}
function streamFromInternet(address, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(address, { timeout: 220000, headers: { 'User-Agent': '501-movie-directors-stremio/1.0 (personal noncommercial catalogue; IMDb public datasets)' } }, res => {
      if ([301,302,303,307,308].includes(res.statusCode)) {
        const to = res.headers.location; res.resume();
        if (!to || redirectCount >= 5) return reject(Error('Too many IMDb redirects'));
        return resolve(streamFromInternet(new URL(to, address).href, redirectCount + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(Error(`${address}: HTTP ${res.statusCode}`)); }
      resolve(res);
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(Error(`IMDb dataset request timed out: ${address}`)));
  });
}
async function readDataset(filename, callback) {
  const local = process.env.IMDB_DIR ? path.join(process.env.IMDB_DIR, filename) : null;
  const compressed = local ? fs.createReadStream(local) : await streamFromInternet(DATASET_URL + filename);
  const input = compressed.pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let first = true, count = 0;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    if (line) { callback(line.split('\t')); count++; }
  }
  console.log(`  ${filename}: ${count.toLocaleString('en-AU')} rows checked`);
}

// IMDb name.basics contains preferred/display names only, not aliases. Provide matching
// variants for internationally credited names and people listed differently in the book.
// Adjust aliases here if an entry appears without any filmography after a rebuild.
const ALIASES = {
  'Alice Guy': ['Alice Guy-Blaché', 'Alice Guy Blaché'],
  'Sergei M Eisenstein': ['Sergei Eisenstein', 'Sergei M. Eisenstein'],
  'Cecil B DeMille': ['Cecil B. DeMille', 'Cecil B. De Mille'],
  'Jean Pierre Melville': ['Jean-Pierre Melville'],
  'Jean Pierre Mocky': ['Jean-Pierre Mocky'],
  'Jean Pierre Jeunet': ['Jean-Pierre Jeunet'],
  'Jean Pierre Dardenne': ['Jean-Pierre Dardenne'],
  'Henri Georges Clouzot': ['Henri-Georges Clouzot'],
  'Krzysztof Kieslowski': ['Krzysztof Kieslowski', 'Krzysztof Kieślowski'],
  'Yasujirô Ozu': ['Yasujirō Ozu', 'Yasujiro Ozu'],
  'Gakuryû Ishii': ['Gakuryu Ishii', 'Sôgo Ishii', 'Sogo Ishii'],
  'Ki young Kim': ['Kim Ki-young', 'Kim Ki-Young'],
  'Ki duk Kim': ['Kim Ki-duk', 'Kim Ki-Duk'],
  'Kwon taek Im': ['Im Kwon-taek', 'Im Kwon-Taek'],
  'Cheh Chang': ['Chang Cheh'],
  'Chan wook Park': ['Park Chan-wook', 'Park Chan-Wook'],
  'Hsiao Hsien Hou': ['Hou Hsiao-hsien', 'Hou Hsiao-Hsien'],
  'Yimou Zhang': ['Zhang Yimou', 'Zhang Yi-Mou'],
  'Hark Tsui': ['Tsui Hark'],
  'Ming liang Tsai': ['Tsai Ming-liang', 'Tsai Ming-Liang'],
  'Kar Wai Wong': ['Wong Kar-Wai', 'Wong Kar-wai'],
  'Jean Luc Godard': ['Jean-Luc Godard'],
  'José Mojica Marins': ['José Mojica Marins', 'Coffin Joe'],
  'Michael Powell': ['Michael Powell'],
  'Emeric Pressburger': ['Emeric Pressburger'],
  'Jean Marie Straub': ['Jean-Marie Straub'],
  'Alejandro G Iñárritu': ['Alejandro González Iñárritu', 'Alejandro G. Iñárritu'],
  'David O Russell': ['David O. Russell'],
  'M Night Shyamalan': ['M. Night Shyamalan'],
  'George A Romero': ['George A. Romero'],
  'Carlos Diegues': ['Cacá Diegues'],
  'Idrissa Ouedraogo': ['Idrissa Ouedraogo', 'Idrissa Ouédraogo'],
  'Ousmane Sembene': ['Ousmane Sembène'],
  'Jirí Weiss': ['Jiří Weiss'],
  'Jirí Menzel': ['Jiří Menzel'],
  'Jaromil Jires': ['Jaromil Jireš'],
  'Jan Nemec': ['Jan Němec'],
  'Frantisek Vlácil': ['František Vláčil'],
  'Shôhei Imamura': ['Shōhei Imamura'],
  'Hideo Nakata': ['Hideo Nakata'],
  'Subhash Ghai': ['Subhash Ghai'],
  'Goran Markovic': ['Goran Marković'],
  'Walt Disney': ['Walter Elias Disney'],
  'Friðrik Þór Friðriksson': ['Fridrik Thor Fridriksson'],
  'Rainer Werner Fassbinder': ['Rainer Werner Fassbinder'],
  'Yilmaz Güney': ['Yılmaz Güney'],
  'Jirí Weiss': ['Jiří Weiss'],
  'Lino Brocka': ['Catalino Brocka'],
  'Kaneto Shindô': ['Kaneto Shindō'],
  'Grigoriy Kozintsev': ['Grigori Kozintsev'],
  'Edwin S Porter': ['Edwin S. Porter'],
};

const members = [...new Set(entries.flatMap(e => e.members))];
const byNormal = new Map();
for (const member of members) {
  for (const value of [member, ...(ALIASES[member] || [])]) {
    const key = norm(value); if (!byNormal.has(key)) byNormal.set(key, new Set());
    byNormal.get(key).add(member);
  }
}

async function build() {
  console.log(`Generating ${entries.length} director entries for ${BASE}`);
  console.log('Step 1/4: matching director names to IMDb identifiers...');
  const candidates = new Map(members.map(m => [m, []]));
  await readDataset('name.basics.tsv.gz', f => {
    const match = byNormal.get(norm(f[1])); if (!match) return;
    const professions = (f[4] || '').split(',');
    // Prefer people recognised by IMDb as directors; many have common names.
    const director = professions.includes('director');
    for (const member of match) {
      const score = (director ? 2000 : 0) + (norm(f[1])===norm(member) ? 100 : 0) + (f[2] !== '\\N' ? 1 : 0);
      candidates.get(member).push({ id: f[0], name: f[1], score, director });
    }
  });

  // Prefer plausible matches, but retain alternative homonyms so selected directors
  // can be compared against actual directed movie credits after title.crew is parsed.
  const idToMembers = new Map();
  for (const member of members) {
    const choices = candidates.get(member).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
    const top = choices.filter(c => c.director).slice(0, 5);
    for (const c of top.length ? top : choices.slice(0,3)) {
      if (!idToMembers.has(c.id)) idToMembers.set(c.id,new Set());
      idToMembers.get(c.id).add(member);
    }
  }
  console.log(`  Matched ${members.filter(m => candidates.get(m).length).length}/${members.length} individual director names (${idToMembers.size} candidate IMDb people).`);

  console.log('Step 2/4: reading directing credits...');
  const movieToPeople = new Map();
  const movieCreditsByPerson = new Map();
  await readDataset('title.crew.tsv.gz', f => {
    if (!f[1] || f[1] === '\\N') return;
    const found = f[1].split(',').filter(p => idToMembers.has(p));
    if (!found.length) return;
    movieToPeople.set(f[0], found);
    for (const p of found) movieCreditsByPerson.set(p,(movieCreditsByPerson.get(p)||0)+1);
  });

  // Resolve homonyms using real directing-credit volume, not just name similarity.
  const personByMember = new Map();
  const resolutions = [];
  for (const member of members) {
    const choices = candidates.get(member);
    const selected = [...choices].filter(c=>idToMembers.has(c.id)).sort((a,b)=>{
      const sa = a.score + Math.min(movieCreditsByPerson.get(a.id)||0,150)*20;
      const sb = b.score + Math.min(movieCreditsByPerson.get(b.id)||0,150)*20;
      return sb-sa || a.id.localeCompare(b.id);
    })[0];
    if (selected) { personByMember.set(member,selected.id);resolutions.push({member,imdbId:selected.id,imdbName:selected.name,candidateCount:choices.length}); }
    else resolutions.push({member,imdbId:null,imdbName:null,candidateCount:0});
  }
  const memberToEntries = new Map();
  for (const [idx,entry] of entries.entries()) for (const member of entry.members) {
    const person = personByMember.get(member); if (!person) continue;
    if (!memberToEntries.has(person)) memberToEntries.set(person,new Set());
    memberToEntries.get(person).add(idx);
  }

  console.log('Step 3/4: joining movie details...');
  // Remove credits from near-name matches that lost the homonym selection.
  const filmById = new Map();
  await readDataset('title.basics.tsv.gz', f => {
    const people = movieToPeople.get(f[0]); if (!people) return;
    // Keep feature films and standalone TV films only. IMDb 'short', 'video',
    // 'tvSeries', 'tvMiniSeries' and 'tvEpisode' credits must not appear.
    // The short-runtime check also catches unusually classified short films
    // and music videos that IMDb happens to label as 'movie' or 'tvMovie'.
    if (!['movie','tvMovie'].includes(f[1]) || f[4] === '1') return;
    const runtime = f[7] === '\\N' ? null : Number(f[7]);
    if (Number.isFinite(runtime) && runtime > 0 && runtime <= 40) return;
    const year = /^\d{4}$/.test(f[5]) ? Number(f[5]) : null;
    if (year && year > nowYear) return; // do not show films scheduled for 2027+ during 2026
    const assigned = new Set(people.flatMap(p => [...(memberToEntries.get(p)||[])]));
    if (!assigned.size) return;
    const film = { id:f[0], name:f[2], year, kind:f[1], rating:null, votes:null,
      runtimeMinutes: Number.isFinite(runtime) && runtime > 0 ? runtime : null,
      genres: f[8] !== '\\N' ? f[8].split(',') : [] };
    filmById.set(f[0], film);
    for (const idx of assigned) entries[idx].films.push(film);
  });

  console.log('Step 4/4: adding IMDb ratings...');
  await readDataset('title.ratings.tsv.gz', f => {
    const film = filmById.get(f[0]); if (!film) return;
    film.rating = Number(f[1]); film.votes = Number(f[2]);
  });

  console.log('Writing Stremio catalogues and website filmographies...');
  for (const subdir of ['films','catalog']) fs.rmSync(path.join(OUT,subdir),{force:true,recursive:true});
  // The book's numbered order is authoritative: #1 Georges Méliès ... #501.
  // Do not alphabetise these values or move Hitchcock to the top.
  const manifestOptions = entries.map(e => e.name);
  const publicDirectors = [];
  for (const e of entries) {
    e.films.sort((a,b)=>(b.year||0)-(a.year||0)||(b.votes||0)-(a.votes||0)||a.name.localeCompare(b.name));
    // One feature film is represented only once even if both members of a pair co-directed it.
    e.films = [...new Map(e.films.map(f=>[f.id,f])).values()];
    const yrs=e.films.map(f=>f.year).filter(Number.isFinite);
    const p={name:e.name,bookNumber:e.bookNumber,slug:e.slug,count:e.films.length,firstYear:yrs.length?Math.min(...yrs):null,lastYear:yrs.length?Math.max(...yrs):null};
    publicDirectors.push(p);
    writeJSON(`films/${e.slug}.json`,{name:e.name,updated:new Date().toISOString(),films:e.films});
    const metas = e.films.map(f=>({id:f.id,type:'movie',name:f.name,
      poster:`https://images.metahub.space/poster/medium/${f.id}/img`,
      background:`https://images.metahub.space/background/medium/${f.id}/img`,
      releaseInfo:String(f.year || ''),
      ...(Number.isFinite(f.rating)?{imdbRating:f.rating.toFixed(1)}:{}),
      genres:f.genres,
      ...(f.runtimeMinutes?{runtime:`${f.runtimeMinutes} min`}:{}),
      description:`Directed by ${e.name}${f.year?` · ${f.year}`:''}${f.kind==='tvMovie'?' · TV film':''}${f.rating?` · IMDb ${f.rating.toFixed(1)}/10`:''}.` }));
    for(let skip=0;skip<=Math.max(PAGE,metas.length);skip+=PAGE){
      const part={metas:metas.slice(skip,skip+PAGE)};
      const suffix=skip?`&skip=${skip}`:'';
      // GitHub Pages maps %-escaped URL paths to files with ordinary Unicode characters.
      writeJSON(`catalog/movie/501-directors/genre=${e.name}${suffix}.json`,part);
    }
  }
  const updated=new Date().toISOString();
  writeJSON('directors.json',{updated,source:'IMDb public non-commercial datasets',total:entries.length,directors:publicDirectors});
  writeJSON('data-health.json',{updated,matchedMembers:resolutions.filter(x=>x.imdbId).length,totalMembers:members.length,
    withFilms:entries.filter(e=>e.films.length).length,missing:entries.filter(e=>!e.films.length).map(e=>e.name),nameResolutions:resolutions});
  const manifest={
    id:'community.501moviedirectors',version:'1.0.1',name:'501 Movie Directors',
    description:'Browse the 501 directors in book order, from #1 to #501. Feature films and standalone TV films only, newest first. Updated weekly. Unofficial catalogue-only Stremio add-on.',
    logo:`${BASE}/assets/logo.png`,background:`${BASE}/assets/hitchcock-background.jpg`,
    resources:['catalog'],types:['movie'],idPrefixes:['tt'],
    catalogs:[{type:'movie',id:'501-directors',name:'501 Movie Directors',
      genres:manifestOptions,extra:[{name:'genre',options:manifestOptions,isRequired:true},{name:'skip',isRequired:false}]}]
  };
  writeJSON('manifest.json',manifest);
  if (entries.filter(e=>e.films.length).length < Number(process.env.MIN_MATCHED_ENTRIES||400)) {
    throw Error('Too many missing filmographies — inspect docs/data-health.json and the name aliases before publishing.');
  }
  for (const n of ['Alfred Hitchcock','Christopher Nolan','Martin Scorsese','Steven Spielberg','Joel Coen & Ethan Coen']) {
    const e=entries.find(x=>x.name===n); console.log(`  ${n}: ${e.films.length} films · ${e.films.slice(0,3).map(f=>`${f.name} (${f.year})`).join(', ')}`);
  }
  console.log(`Done: ${entries.filter(e=>e.films.length).length}/501 entries with at least one IMDb movie.`);
}
build().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
