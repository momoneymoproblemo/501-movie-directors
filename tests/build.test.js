'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const zlib = require('node:zlib');
const ROOT = path.join(__dirname, '..');
const lines = fs.readFileSync(path.join(ROOT, 'data', 'directors.txt'), 'utf8').trim().split(/\r?\n/);

test('book contains 501 unique entries, ordered #1 through #501', () => {
  assert.equal(lines.length, 501);
  assert.equal(new Set(lines).size, 501);
  assert.deepEqual(lines.slice(0, 3), ['Georges Méliès', 'August Blom', 'Edwin S Porter']);
  assert.equal(lines[77], 'Alfred Hitchcock');
  assert.equal(lines[500], 'David Gordon Green');
  assert(lines.includes('Satyajit Ray'));
  assert(lines.includes('Ram Gopal Varma'));
  assert(lines.includes('Joel Coen & Ethan Coen'));
});

test('build retains book order and only feature films / standalone TV films', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), '501-directors-test-'));
  try {
    const imdb = path.join(tmp, 'imdb'), out = path.join(tmp, 'out');
    fs.mkdirSync(imdb);
    const write = (filename, rows) => fs.writeFileSync(path.join(imdb, filename), zlib.gzipSync(rows.join('\n') + '\n'));
    write('name.basics.tsv.gz', [
      'nconst\tprimaryName\tbirthYear\tdeathYear\tprimaryProfession\tknownForTitles',
      'nm0001\tAlfred Hitchcock\t1899\t1980\tdirector,producer\ttt0001',
      'nm0002\tChristopher Nolan\t1970\t\\N\tdirector,writer\ttt0005',
      'nm0003\tJoel Coen\t1954\t\\N\tdirector,writer\ttt0003',
      'nm0004\tEthan Coen\t1957\t\\N\tdirector,producer\ttt0003',
      'nm0005\tAlfred Hitchcock\t\\N\t\\N\tactor\t\\N',
      'nm0006\tSatyajit Ray\t1921\t1992\tdirector,writer\ttt0014'
    ]);
    write('title.crew.tsv.gz', [
      'tconst\tdirectors\twriters',
      'tt0001\tnm0001\t\\N', 'tt0002\tnm0001\t\\N',
      'tt0003\tnm0003,nm0004\t\\N', 'tt0004\tnm0004\t\\N',
      'tt0005\tnm0002\t\\N', 'tt0006\tnm0001\t\\N',
      'tt0007\tnm0001\t\\N', 'tt0008\tnm0001\t\\N',
      'tt0009\tnm0001\t\\N', 'tt0010\tnm0001\t\\N',
      'tt0011\tnm0001\t\\N', 'tt0012\tnm0001\t\\N',
      'tt0013\tnm0001\t\\N', 'tt0014\tnm0006\t\\N',
      'tt0015\tnm0001\t\\N', 'tt0016\tnm0001\t\\N',
      'tt0017\tnm0001\t\\N', 'tt0018\tnm0001\t\\N'
    ]);
    write('title.basics.tsv.gz', [
      'tconst\ttitleType\tprimaryTitle\toriginalTitle\tisAdult\tstartYear\tendYear\truntimeMinutes\tgenres',
      'tt0001\tmovie\tPsycho\tPsycho\t0\t1960\t\\N\t109\tHorror,Thriller',
      'tt0002\tmovie\tFamily Plot\tFamily Plot\t0\t1976\t\\N\t120\tComedy,Thriller',
      'tt0003\tmovie\tJoint Film\tJoint Film\t0\t2001\t\\N\t120\tDrama',
      'tt0004\tmovie\tSolo Film\tSolo Film\t0\t2020\t\\N\t90\tDrama',
      'tt0005\tmovie\tNolan Film\tNolan Film\t0\t2023\t\\N\t180\tDrama',
      'tt0006\tshort\tShort Test\tShort Test\t0\t1965\t\\N\t20\tDrama',
      'tt0007\tmovie\tFuture Test\tFuture Test\t0\t2099\t\\N\t90\tDrama',
      'tt0008\tmovie\tAdult Test\tAdult Test\t1\t1955\t\\N\t90\tDrama',
      'tt0009\ttvMovie\tTV Film\tTV Film\t0\t1964\t\\N\t75\tDrama',
      'tt0010\tvideo\tMusic Video\tMusic Video\t0\t1968\t\\N\t4\tMusic',
      'tt0011\ttvSeries\tTV Series\tTV Series\t0\t1969\t\\N\t60\tDrama',
      'tt0012\ttvEpisode\tTV Episode\tTV Episode\t0\t1970\t\\N\t60\tDrama',
      'tt0013\tmovie\tMisclassified Music Video\tMisclassified Music Video\t0\t1971\t\\N\t6\tMusic',
      'tt0014\tmovie\tIndian Language Feature\tIndian Language Feature\t0\t1973\t\\N\t115\tDrama',
      'tt0015\tmovie\tRuntime Unknown Film\tRuntime Unknown Film\t0\t1963\t\\N\t\\N\tDrama',
      'tt0016\ttvMiniSeries\tTV Mini Series\tTV Mini Series\t0\t1972\t\\N\t600\tDrama',
      'tt0017\tmovie\t40 Minute Short\t40 Minute Short\t0\t1974\t\\N\t40\tDrama',
      'tt0018\tmovie\tFeature Music Film\tFeature Music Film\t0\t1954\t\\N\t95\tMusic'
    ]);
    write('title.ratings.tsv.gz', [
      'tconst\taverageRating\tnumVotes',
      'tt0001\t8.5\t800000', 'tt0002\t6.8\t23000',
      'tt0003\t8.0\t100000', 'tt0004\t7.4\t20000',
      'tt0005\t8.7\t89000'
    ]);
    const result = spawnSync(process.execPath, ['build.js'], {
      cwd: ROOT, encoding: 'utf8',
      env: {...process.env, IMDB_DIR: imdb, OUT_DIR: out, PUBLIC_BASE: 'https://example.github.io/test', MIN_MATCHED_ENTRIES: '0'},
      timeout: 30000
    });
    assert.equal(result.status, 0, `${result.stdout||''}\n${result.stderr||''}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    const opts = manifest.catalogs[0].extra[0].options;
    assert.equal(opts.length, 501);
    assert.deepEqual(opts.slice(0, 3), ['Georges Méliès', 'August Blom', 'Edwin S Porter']);
    assert.equal(opts[77], 'Alfred Hitchcock');
    assert.equal(opts[500], 'David Gordon Green');
    assert.equal(manifest.catalogs[0].extra[0].isRequired, true);
    const h = JSON.parse(fs.readFileSync(path.join(out, 'films/alfred-hitchcock.json'), 'utf8'));
    assert.deepEqual(h.films.map(x => x.name), ['Family Plot', 'TV Film', 'Runtime Unknown Film', 'Psycho', 'Feature Music Film']);
    const c = JSON.parse(fs.readFileSync(path.join(out, 'films/joel-coen-and-ethan-coen.json'), 'utf8'));
    assert.deepEqual(c.films.map(x => x.name), ['Solo Film', 'Joint Film']);
    const cat = JSON.parse(fs.readFileSync(path.join(out, 'catalog/movie/501-directors/genre=Alfred Hitchcock.json'), 'utf8'));
    assert.deepEqual(cat.metas.map(x => x.name), h.films.map(x => x.name));
    const ray = JSON.parse(fs.readFileSync(path.join(out, 'films/satyajit-ray.json'), 'utf8'));
    assert.deepEqual(ray.films.map(x => x.name), ['Indian Language Feature']);
    const directors = JSON.parse(fs.readFileSync(path.join(out, 'directors.json'), 'utf8'));
    assert.equal(directors.total, 501);
    assert.deepEqual(directors.directors.slice(0, 3).map(x => x.name), ['Georges Méliès', 'August Blom', 'Edwin S Porter']);
    const website = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
    assert(website.includes('sort((a,b)=>a.bookNumber-b.bookNumber)'));
    assert(!website.includes('slice(0,180)'));
    assert(website.includes("padStart(3,'0')} · ${d.name}"));
  } finally {
    fs.rmSync(tmp, {force:true, recursive:true});
  }
});
