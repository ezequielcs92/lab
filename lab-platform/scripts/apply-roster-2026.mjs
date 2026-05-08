import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function parseEnv(path) {
  const out = {};
  const raw = fs.readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const idx = l.indexOf('=');
    if (idx === -1) continue;
    const k = l.slice(0, idx).trim();
    const v = l.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

const env = parseEnv('.env.local');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Faltan variables de Supabase en .env.local');

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const markdown = fs.readFileSync('d:/Descargas/rosters_2026.md', 'utf8');
const lines = markdown.split(/\r?\n/);

function mapClubSlug(header) {
  const h = header.toLowerCase();
  if (h.includes('arias')) return 'arias';
  if (h.includes('cachorros')) return 'cachorros';
  if (h.includes('popeye')) return 'infernales';
  if (h.includes('daom')) return 'daom';
  if (h.includes('falcons')) return 'falcons';
  return null;
}

function mapPos(posRaw) {
  const p = (posRaw || '').trim().toLowerCase();
  if (!p || p === '-' || p === '—') return 'utility';
  if (/^p$|pitcher|p\//.test(p)) return 'pitcher';
  if (/^c$|catcher|c\//.test(p)) return 'catcher';
  if (/\b1b\b/.test(p)) return 'primera_base';
  if (/\b2b\b/.test(p)) return 'segunda_base';
  if (/\b3b\b/.test(p)) return 'tercera_base';
  if (/\bss\b/.test(p)) return 'shortstop';
  if (/\bdh\b/.test(p)) return 'designated_hitter';
  if (/of|outfield/.test(p)) return 'center_field';
  if (/if|infield/.test(p)) return 'shortstop';
  if (/ut|utl|utility/.test(p)) return 'utility';
  return 'utility';
}

const players = [];
const staff = [];
let club = null;
let inTable = false;
let inStaff = false;

for (const line of lines) {
  const head = line.match(/^##\s+(.+)$/);
  if (head) {
    club = mapClubSlug(head[1]);
    inTable = false;
    inStaff = false;
    continue;
  }
  if (!club) continue;

  if (/^\|\s*#\s*\|\s*Jugador\s*\|/i.test(line)) {
    inTable = true;
    inStaff = false;
    continue;
  }
  if (/^\|---/.test(line)) continue;

  if (/^\*\*Staff técnico:\*\*/i.test(line) || /^\*\*Staff tecnico:\*\*/i.test(line)) {
    inStaff = true;
    inTable = false;
    continue;
  }

  if (inTable) {
    const m = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*$/);
    if (!m) continue;
    const numDigits = m[1].replace(/[^0-9]/g, '');
    const numero = numDigits ? Number(numDigits) : null;
    const nombre = m[2].trim();
    if (!nombre) continue;
    players.push({ club, numero, nombre, posicion: mapPos(m[3]) });
    continue;
  }

  if (inStaff) {
    const m = line.match(/^-\s*([^:]+):\s*(.+)$/);
    if (!m) continue;
    staff.push({ club, cargo: m[1].trim(), nombre: m[2].trim() });
  }
}

const targetSlugs = ['arias', 'cachorros', 'infernales', 'daom', 'falcons'];
const { data: clubs, error: clubsErr } = await supabase
  .from('clubes')
  .select('id,slug')
  .in('slug', targetSlugs);
if (clubsErr) throw clubsErr;

const clubMap = Object.fromEntries((clubs || []).map(c => [c.slug, c.id]));
for (const s of targetSlugs) {
  if (!clubMap[s]) throw new Error(`No existe club slug=${s}`);
}

const { data: temp, error: tempErr } = await supabase
  .from('temporadas')
  .select('id,anio')
  .eq('anio', 2026)
  .maybeSingle();
if (tempErr) throw tempErr;
const temporadaId = temp?.id ?? null;

const clubIds = targetSlugs.map(s => clubMap[s]);
const { error: delErr } = await supabase.from('jugadores').delete().in('club_id', clubIds);
if (delErr) throw delErr;

const payload = players.map((p, i) => {
  const slugHash = crypto
    .createHash('md5')
    .update(`${p.club}|${p.nombre}|${p.numero ?? ''}|${i + 1}`)
    .digest('hex')
    .slice(0, 12);

  return {
    nombre: p.nombre,
    slug: `${p.club}-${slugHash}`,
    numero_camiseta: p.numero,
    posicion: p.posicion,
    club_id: clubMap[p.club],
    temporada_id: temporadaId,
    activo: true,
  };
});

for (let i = 0; i < payload.length; i += 200) {
  const chunk = payload.slice(i, i + 200);
  const { error } = await supabase.from('jugadores').insert(chunk);
  if (error) throw error;
}

const ariasId = clubMap['arias'];
const infernalesId = clubMap['infernales'];
const staffTargets = ['Manager', 'Bench Coach', 'Pitching Coach', 'Coach', 'Jefe de equipo'];
const { error: delStaffErr } = await supabase
  .from('staff_clubes')
  .delete()
  .in('club_id', [ariasId, infernalesId])
  .in('cargo', staffTargets);
if (delStaffErr) throw delStaffErr;

const staffRows = [];
let ordA = 1;
let ordI = 1;
for (const s of staff) {
  if (s.club === 'arias') {
    staffRows.push({ club_id: ariasId, nombre: s.nombre, cargo: s.cargo, orden: ordA++ });
  }
  if (s.club === 'infernales') {
    staffRows.push({ club_id: infernalesId, nombre: s.nombre, cargo: s.cargo, orden: ordI++ });
  }
}
if (staffRows.length) {
  const { error: staffInsErr } = await supabase.from('staff_clubes').insert(staffRows);
  if (staffInsErr) throw staffInsErr;
}

const { data: verify, error: verifyErr } = await supabase
  .from('jugadores')
  .select('club_id')
  .in('club_id', clubIds);
if (verifyErr) throw verifyErr;

const counts = { arias: 0, cachorros: 0, infernales: 0, daom: 0, falcons: 0 };
for (const row of verify || []) {
  for (const slug of targetSlugs) {
    if (clubMap[slug] === row.club_id) counts[slug] += 1;
  }
}

console.log('Jugadores cargados:', verify?.length || 0);
console.log('Detalle:', counts);
console.log('Staff tecnico cargado:', staffRows.length);
