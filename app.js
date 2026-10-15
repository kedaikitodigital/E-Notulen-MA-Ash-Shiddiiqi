(() => {
'use strict';

/* ===================== Konstanta & penyimpanan ===================== */
const KEY_NOTES = 'notulen.ashshiddiiqi.notes.v1';
const KEY_SET = 'notulen.ashshiddiiqi.settings.v1';
const JENIS = [
  'Rapat Dewan Guru', 'Rapat Pleno Guru & Tendik', 'Rapat Komite Madrasah', 'Rapat Wali Murid',
  'Rapat Yayasan', 'Rapat OSIS / Kesiswaan', 'Rapat Kurikulum', 'Rapat Kerja (Raker)',
  'Evaluasi / Muhasabah', 'Pertemuan Lainnya'
];
const STATUS_HADIR = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const DEFAULT_SETTINGS = {
  nama: 'MA Ash-Shiddiiqi', yayasan: '', alamat: '', kontak: '', kota: '', singkatan: 'MAAS',
  kepala: '', nipKepala: '', wa: '', master: '', logo: ''
};

const load = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Gagal menyimpan: penyimpanan browser penuh/dinonaktifkan'); return false; } };

let notes = load(KEY_NOTES, []);
let settings = { ...DEFAULT_SETTINGS, ...load(KEY_SET, {}) };
const saveNotes = () => store(KEY_NOTES, notes);
const saveSettings = () => store(KEY_SET, settings);

/* ===================== Helper ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(2, '0');

const parseD = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtD = (s, opt) => { const d = parseD(s); return d ? d.toLocaleDateString('id-ID', opt || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
const fmtShort = s => fmtD(s, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtLong = s => fmtD(s, { day: 'numeric', month: 'long', year: 'numeric' });
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const waktu = n => n.mulai ? `${n.mulai} – ${n.selesai || 'selesai'} WIB` : '';

let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Teks disalin'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Teks disalin'); } catch { toast('Gagal menyalin'); }
    ta.remove();
  }
}

function nextNomor(tgl) {
  const d = parseD(tgl) || new Date(); const y = d.getFullYear(); let max = 0;
  notes.forEach(n => { const dd = parseD(n.tanggal); if (dd && dd.getFullYear() === y) { const m = /^(\d+)\//.exec(n.nomor || ''); if (m) max = Math.max(max, +m[1]); } });
  return `${pad(max + 1).padStart(3, '0')}/NTL/${settings.singkatan || 'MA'}/${ROMAWI[d.getMonth() + 1]}/${y}`;
}

const sorted = () => [...notes].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.dibuat || 0) - (a.dibuat || 0));
const hadirCount = n => (n.peserta || []).filter(p => p.status === 'Hadir').length;

function blankNote() {
  return {
    id: uid(), nomor: nextNomor(todayStr()), jenis: JENIS[0], judul: '', tanggal: todayStr(), mulai: '08:00', selesai: '',
    tempat: '', pimpinan: '', notulis: '', peserta: [], agenda: [], pembahasan: '', keputusan: [], tindak: [],
    berikutnya: { tanggal: '', waktu: '', tempat: '' }, catatan: '', status: 'draft', dibuat: Date.now(), diubah: Date.now()
  };
}

function parseMaster() {
  return (settings.master || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [nama, ...rest] = l.split('|'); return { nama: nama.trim(), jabatan: rest.join('|').trim(), status: 'Hadir' };
  }).filter(p => p.nama);
}

/* ===================== Router ===================== */
function setBrand() {
  $('#brandName').textContent = settings.nama || 'Notulen';
  $('#brandLogo').src = settings.logo || 'icon.svg';
}
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [p, id] = h.split('/');
  $$('.topbar nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === (p === 'pengaturan' ? 'pengaturan' : (['', 'lihat', 'baru', 'edit'].includes(p || '') ? '' : null))));
  window.scrollTo(0, 0);
  if (!p) return viewList();
  if (p === 'baru') return viewForm();
  if (p === 'edit') return viewForm(id);
  if (p === 'lihat') return viewDoc(id);
  if (p === 'pengaturan') return viewSettings();
  viewList();
}
window.addEventListener('hashchange', route);

/* ===================== Beranda / daftar ===================== */
const flt = { q: '', jenis: '', status: '' };

function openTasks() {
  const out = [];
  notes.forEach(n => (n.tindak || []).forEach((t, i) => { if (!t.selesai && t.tugas) out.push({ n, t, i }); }));
  return out.sort((a, b) => (a.t.tenggat || '9999').localeCompare(b.t.tenggat || '9999'));
}

function viewList() {
  const open = openTasks();
  const now = new Date();
  const bulanIni = notes.filter(n => { const d = parseD(n.tanggal); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const jenisAll = [...new Set([...JENIS, ...notes.map(n => n.jenis)])];
  const today = todayStr();
  app.innerHTML = `
    <section class="stats">
      <div class="stat"><b>${notes.length}</b><span>Total notulen</span></div>
      <div class="stat"><b>${bulanIni}</b><span>Bulan ini</span></div>
      <div class="stat"><b>${open.length}</b><span>Tindak lanjut terbuka</span></div>
    </section>
    <section class="filters">
      <input id="q" type="search" placeholder="Cari judul, tempat, isi pembahasan…" value="${esc(flt.q)}">
      <div class="grid2">
        <select id="fj"><option value="">Semua jenis</option>${jenisAll.map(j => `<option ${j === flt.jenis ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select>
        <select id="fs"><option value="">Semua status</option><option value="draft" ${flt.status === 'draft' ? 'selected' : ''}>Draft</option><option value="final" ${flt.status === 'final' ? 'selected' : ''}>Final</option></select>
      </div>
    </section>
    <div id="listBox"></div>
    ${open.length ? `<section class="card"><h3>Tindak lanjut belum selesai</h3><div id="taskBox">
      ${open.slice(0, 8).map(({ n, t, i }) => `
        <div class="task"><input type="checkbox" data-id="${n.id}" data-i="${i}" aria-label="Tandai selesai">
          <div>${esc(t.tugas)}<small>${esc(t.pic || '—')}${t.tenggat ? ` • <span class="${t.tenggat < today ? 'late' : ''}">${fmtShort(t.tenggat)}${t.tenggat < today ? ' (lewat)' : ''}</span>` : ''} • <a href="#/lihat/${n.id}">${esc(n.judul)}</a></small></div>
        </div>`).join('')}
      ${open.length > 8 ? `<p class="muted">…dan ${open.length - 8} lainnya</p>` : ''}</div></section>` : ''}
    <a href="#/baru" class="fab">＋ Notulen Baru</a>`;

  const draw = () => {
    const q = flt.q.trim().toLowerCase();
    const hay = n => [n.judul, n.tempat, n.pimpinan, n.notulis, n.nomor, n.pembahasan, ...(n.agenda || []), ...(n.keputusan || [])].join(' ').toLowerCase();
    const list = sorted().filter(n => (!flt.jenis || n.jenis === flt.jenis) && (!flt.status || n.status === flt.status) && (!q || hay(n).includes(q)));
    $('#listBox').innerHTML = list.length ? list.map(n => `
      <a class="card note" href="#/lihat/${n.id}">
        <span class="tag">${esc(n.jenis)}</span> <span class="badge ${n.status === 'final' ? 'final' : ''}">${n.status === 'final' ? 'Final' : 'Draft'}</span>
        <h3>${esc(n.judul)}</h3>
        <p class="meta">${esc(fmtD(n.tanggal))}${n.tempat ? ' • ' + esc(n.tempat) : ''}</p>
        <p class="meta">Hadir ${hadirCount(n)}/${(n.peserta || []).length} • ${(n.keputusan || []).length} keputusan • ${(n.tindak || []).length} tindak lanjut</p>
      </a>`).join('') :
      `<div class="card empty">${notes.length ? 'Tidak ada notulen yang cocok dengan pencarian.' : 'Belum ada notulen.<br>Tekan <b>＋ Notulen Baru</b> untuk memulai.'}</div>`;
  };
  draw();
  $('#q').addEventListener('input', e => { flt.q = e.target.value; draw(); });
  $('#fj').addEventListener('change', e => { flt.jenis = e.target.value; draw(); });
  $('#fs').addEventListener('change', e => { flt.status = e.target.value; draw(); });
  const tb = $('#taskBox');
  if (tb) tb.addEventListener('change', e => {
    if (!e.target.matches('input[type=checkbox]')) return;
    const n = notes.find(x => x.id === e.target.dataset.id);
    if (n && n.tindak[+e.target.dataset.i]) { n.tindak[+e.target.dataset.i].selesai = true; n.diubah = Date.now(); saveNotes(); toast('Tindak lanjut ditandai selesai'); viewList(); }
  });
}

/* ===================== Form ===================== */
const rowP = (p = {}) => `<div class="row prow"><input class="r-nama" placeholder="Nama" value="${esc(p.nama)}"><input class="r-jab" placeholder="Jabatan" value="${esc(p.jabatan)}"><select class="r-st" aria-label="Kehadiran">${STATUS_HADIR.map(s => `<option ${s === (p.status || 'Hadir') ? 'selected' : ''}>${s}</option>`).join('')}</select><button type="button" class="x" aria-label="Hapus">✕</button></div>`;
const rowA = (v = '') => `<div class="row srow"><input class="r-text" placeholder="Butir agenda" value="${esc(v)}"><button type="button" class="x" aria-label="Hapus">✕</button></div>`;
const rowK = (v = '') => `<div class="row srow"><textarea class="r-text" rows="2" placeholder="Keputusan / kesimpulan">${esc(v)}</textarea><button type="button" class="x" aria-label="Hapus">✕</button></div>`;
const rowT = (t = {}) => `<div class="row trow"><input class="r-tugas" placeholder="Kegiatan / tugas" value="${esc(t.tugas)}"><input class="r-pic" placeholder="Penanggung jawab" value="${esc(t.pic)}"><input class="r-due" type="date" value="${esc(t.tenggat)}" aria-label="Tenggat"><label class="chk"><input class="r-done" type="checkbox" ${t.selesai ? 'checked' : ''}> Selesai</label><button type="button" class="x" aria-label="Hapus">✕</button></div>`;

function viewForm(id) {
  const ex = id ? notes.find(n => n.id === id) : null;
  if (id && !ex) { toast('Notulen tidak ditemukan'); location.hash = '#/'; return; }
  const n = ex ? clone(ex) : blankNote();
  n.berikutnya = n.berikutnya || { tanggal: '', waktu: '', tempat: '' };
  const jenisList = JENIS.includes(n.jenis) ? JENIS : [...JENIS, n.jenis];
  app.innerHTML = `
  <form id="f" class="form" autocomplete="off">
    <div class="pagehead"><h2>${ex ? 'Edit Notulen' : 'Notulen Baru'}</h2></div>

    <section class="card">
      <h3>Informasi Rapat</h3>
      <label>Jenis pertemuan<select name="jenis">${jenisList.map(j => `<option ${j === n.jenis ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></label>
      <label>Judul / tema *<input name="judul" required value="${esc(n.judul)}" placeholder="mis. Persiapan Asesmen Sumatif Akhir Semester"></label>
      <div class="grid2">
        <label>Tanggal *<input type="date" name="tanggal" required value="${esc(n.tanggal)}"></label>
        <label>Nomor notulen<input name="nomor" value="${esc(n.nomor)}"></label>
      </div>
      <div class="grid2">
        <label>Mulai<input type="time" name="mulai" value="${esc(n.mulai)}"></label>
        <label>Selesai<input type="time" name="selesai" value="${esc(n.selesai)}"></label>
      </div>
      <label>Tempat<input name="tempat" value="${esc(n.tempat)}" placeholder="mis. Ruang Guru / Aula Madrasah"></label>
      <div class="grid2">
        <label>Pimpinan rapat<input name="pimpinan" value="${esc(n.pimpinan)}"></label>
        <label>Notulis<input name="notulis" value="${esc(n.notulis)}"></label>
      </div>
    </section>

    <section class="card">
      <div class="sechead"><h3>Daftar Hadir</h3><span id="pCount" class="muted"></span></div>
      <div id="pList">${(n.peserta || []).map(rowP).join('')}</div>
      <div class="btnrow">
        <button type="button" class="btn sm" id="pAdd">＋ Peserta</button>
        <button type="button" class="btn sm ghost" id="pMaster">Muat daftar tetap</button>
        <button type="button" class="btn sm ghost" id="pAll">Semua hadir</button>
      </div>
      <details><summary>Tempel banyak nama sekaligus</summary>
        <textarea id="pBulk" rows="4" placeholder="Satu nama per baris. Boleh: Nama | Jabatan"></textarea>
        <div class="btnrow"><button type="button" class="btn sm" id="pBulkAdd">Tambahkan</button></div>
      </details>
    </section>

    <section class="card">
      <h3>Agenda</h3>
      <div id="aList">${(n.agenda || []).map(rowA).join('')}</div>
      <button type="button" class="btn sm ghost" id="aAdd">＋ Agenda</button>
    </section>

    <section class="card">
      <h3>Pembahasan</h3>
      <textarea name="pembahasan" rows="10" placeholder="Tuliskan jalannya pembahasan, pendapat peserta, dan hal penting yang disampaikan…">${esc(n.pembahasan)}</textarea>
    </section>

    <section class="card">
      <h3>Keputusan / Kesimpulan</h3>
      <div id="kList">${(n.keputusan || []).map(rowK).join('')}</div>
      <button type="button" class="btn sm ghost" id="kAdd">＋ Keputusan</button>
    </section>

    <section class="card">
      <h3>Tindak Lanjut</h3>
      <div id="tList">${(n.tindak || []).map(rowT).join('')}</div>
      <button type="button" class="btn sm ghost" id="tAdd">＋ Tindak lanjut</button>
    </section>

    <section class="card">
      <h3>Rapat Berikutnya & Catatan</h3>
      <div class="grid2">
        <label>Tanggal<input type="date" name="bTanggal" value="${esc(n.berikutnya.tanggal)}"></label>
        <label>Waktu<input type="time" name="bWaktu" value="${esc(n.berikutnya.waktu)}"></label>
      </div>
      <label>Tempat<input name="bTempat" value="${esc(n.berikutnya.tempat)}"></label>
      <label>Catatan tambahan<textarea name="catatan" rows="3">${esc(n.catatan)}</textarea></label>
      <label>Status<select name="status"><option value="draft" ${n.status !== 'final' ? 'selected' : ''}>Draft (masih bisa diubah)</option><option value="final" ${n.status === 'final' ? 'selected' : ''}>Final</option></select></label>
    </section>

    <div class="actionbar">
      <a class="btn ghost" href="${ex ? '#/lihat/' + n.id : '#/'}">Batal</a>
      <button class="btn" type="submit">Simpan</button>
    </div>
  </form>`;

  const f = $('#f');
  const lists = { pList: rowP, aList: rowA, kList: rowK, tList: rowT };
  const add = (id, data) => $('#' + id).insertAdjacentHTML('beforeend', lists[id](data));
  const countP = () => {
    const rows = $$('#pList .prow'); const h = rows.filter(r => $('.r-st', r).value === 'Hadir').length;
    $('#pCount').textContent = rows.length ? `${h} hadir dari ${rows.length}` : '';
  };
  countP();
  $('#pAdd').onclick = () => { add('pList'); countP(); $$('#pList .r-nama').pop().focus(); };
  $('#aAdd').onclick = () => { add('aList'); $$('#aList .r-text').pop().focus(); };
  $('#kAdd').onclick = () => { add('kList'); $$('#kList .r-text').pop().focus(); };
  $('#tAdd').onclick = () => { add('tList'); $$('#tList .r-tugas').pop().focus(); };
  const existing = () => new Set($$('#pList .r-nama').map(i => i.value.trim().toLowerCase()));
  $('#pMaster').onclick = () => {
    const m = parseMaster();
    if (!m.length) { toast('Daftar tetap kosong. Isi di menu Pengaturan.'); return; }
    const have = existing(); let c = 0;
    m.forEach(p => { if (!have.has(p.nama.toLowerCase())) { add('pList', p); c++; } });
    countP(); toast(c ? `${c} peserta ditambahkan` : 'Semua sudah ada');
  };
  $('#pBulkAdd').onclick = () => {
    const have = existing(); let c = 0;
    $('#pBulk').value.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      const [nama, ...r] = l.split('|'); const nm = nama.trim();
      if (nm && !have.has(nm.toLowerCase())) { add('pList', { nama: nm, jabatan: r.join('|').trim(), status: 'Hadir' }); have.add(nm.toLowerCase()); c++; }
    });
    $('#pBulk').value = ''; countP(); toast(c ? `${c} peserta ditambahkan` : 'Tidak ada nama baru');
  };
  $('#pAll').onclick = () => { $$('#pList .r-st').forEach(s => s.value = 'Hadir'); countP(); };
  f.addEventListener('click', e => { const b = e.target.closest('.x'); if (b) { b.closest('.row').remove(); countP(); } });
  f.addEventListener('change', e => { if (e.target.matches('.r-st')) countP(); });

  f.addEventListener('submit', e => {
    e.preventDefault();
    const g = k => f.elements[k].value.trim();
    const data = {
      ...n,
      jenis: g('jenis'), judul: g('judul'), tanggal: g('tanggal'), nomor: g('nomor'), mulai: g('mulai'), selesai: g('selesai'),
      tempat: g('tempat'), pimpinan: g('pimpinan'), notulis: g('notulis'), pembahasan: f.elements.pembahasan.value.trim(),
      peserta: $$('#pList .prow').map(r => ({ nama: $('.r-nama', r).value.trim(), jabatan: $('.r-jab', r).value.trim(), status: $('.r-st', r).value })).filter(p => p.nama),
      agenda: $$('#aList .r-text').map(i => i.value.trim()).filter(Boolean),
      keputusan: $$('#kList .r-text').map(i => i.value.trim()).filter(Boolean),
      tindak: $$('#tList .trow').map(r => ({ tugas: $('.r-tugas', r).value.trim(), pic: $('.r-pic', r).value.trim(), tenggat: $('.r-due', r).value, selesai: $('.r-done', r).checked })).filter(t => t.tugas),
      berikutnya: { tanggal: g('bTanggal'), waktu: g('bWaktu'), tempat: g('bTempat') },
      catatan: f.elements.catatan.value.trim(), status: g('status'), diubah: Date.now()
    };
    if (ex) notes[notes.findIndex(x => x.id === ex.id)] = data; else notes.unshift(data);
    if (saveNotes()) { toast('Notulen tersimpan'); location.hash = '#/lihat/' + data.id; }
  });
}

/* ===================== Dokumen ===================== */
function docHTML(n) {
  const s = settings;
  const secs = [];
  if ((n.peserta || []).length) {
    const rows = n.peserta.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${esc(p.nama)}</td><td>${esc(p.jabatan)}</td><td class="c">${esc(p.status)}</td></tr>`).join('');
    const cnt = st => n.peserta.filter(p => p.status === st).length;
    const ket = ['Izin', 'Sakit', 'Alpa'].filter(st => cnt(st)).map(st => `${st} ${cnt(st)}`).join(', ');
    secs.push(['Daftar Hadir', `<table class="grid-t"><thead><tr><th style="width:36px">No</th><th>Nama</th><th>Jabatan</th><th style="width:80px">Ket.</th></tr></thead><tbody>${rows}</tbody></table><p class="sum">Hadir ${cnt('Hadir')} dari ${n.peserta.length} peserta${ket ? ' (' + ket + ')' : ''}.</p>`]);
  }
  if ((n.agenda || []).length) secs.push(['Agenda', `<ol>${n.agenda.map(a => `<li>${esc(a)}</li>`).join('')}</ol>`]);
  if (n.pembahasan) secs.push(['Pembahasan', `<div class="pre">${esc(n.pembahasan)}</div>`]);
  if ((n.keputusan || []).length) secs.push(['Keputusan / Kesimpulan', `<ol>${n.keputusan.map(k => `<li class="pre">${esc(k)}</li>`).join('')}</ol>`]);
  if ((n.tindak || []).length) secs.push(['Tindak Lanjut', `<table class="grid-t"><thead><tr><th style="width:36px">No</th><th>Kegiatan</th><th>PJ</th><th style="width:100px">Tenggat</th><th style="width:70px">Status</th></tr></thead><tbody>${n.tindak.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${esc(t.tugas)}</td><td>${esc(t.pic)}</td><td>${t.tenggat ? esc(fmtShort(t.tenggat)) : '-'}</td><td class="c">${t.selesai ? 'Selesai' : 'Proses'}</td></tr>`).join('')}</tbody></table>`]);
  const b = n.berikutnya || {};
  if (b.tanggal || b.waktu || b.tempat) secs.push(['Rapat Berikutnya', `<div>${[b.tanggal ? fmtD(b.tanggal) : '', b.waktu ? 'pukul ' + b.waktu + ' WIB' : '', b.tempat ? 'di ' + b.tempat : ''].filter(Boolean).map(esc).join(', ')}</div>`]);
  if (n.catatan) secs.push(['Catatan', `<div class="pre">${esc(n.catatan)}</div>`]);

  const info = [['Hari / Tanggal', fmtD(n.tanggal)], ['Waktu', waktu(n)], ['Tempat', n.tempat], ['Acara', n.judul], ['Pimpinan Rapat', n.pimpinan], ['Notulis', n.notulis]]
    .filter(r => r[1]).map(r => `<tr><td>${r[0]}</td><td>:</td><td>${esc(r[1])}</td></tr>`).join('');
  const kontak = [s.alamat, s.kontak].filter(Boolean).map(esc).join(' • ');

  return `
    <div class="kop">${s.logo ? `<img src="${esc(s.logo)}" alt="Logo">` : ''}
      <div>${s.yayasan ? `<div class="y">${esc(s.yayasan)}</div>` : ''}<h1>${esc(s.nama)}</h1>${kontak ? `<div class="a">${kontak}</div>` : ''}</div></div>
    <hr class="kop-line">
    <h2 class="judul">Notulen ${esc(n.jenis)}</h2>
    ${n.nomor ? `<p class="nomor">Nomor: ${esc(n.nomor)}</p>` : '<p class="nomor"></p>'}
    <table class="info">${info}</table>
    ${secs.map((x, i) => `<section class="sec"><h3>${String.fromCharCode(65 + i)}. ${x[0]}</h3>${x[1]}</section>`).join('')}
    <p style="margin-top:.9rem">Demikian notulen ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
    <div class="sig">
      <p class="place">${s.kota ? esc(s.kota) + ', ' : ''}${esc(fmtLong(n.tanggal))}</p>
      <div class="box">Pimpinan Rapat<div class="name">${esc(n.pimpinan || '………………………')}</div></div>
      <div class="box">Notulis<div class="name">${esc(n.notulis || '………………………')}</div></div>
      <div class="box one">Mengetahui,<br>Kepala ${esc(s.nama)}<div class="name">${esc(s.kepala || '………………………')}</div>${s.nipKepala ? `<div>NIP. ${esc(s.nipKepala)}</div>` : ''}</div>
    </div>`;
}

function waText(n) {
  const L = []; const sep = '━━━━━━━━━━━━━━';
  L.push(`📋 *NOTULEN ${n.jenis.toUpperCase()}*`, `*${settings.nama}*`, sep, `*${n.judul}*`);
  if (n.nomor) L.push(`No. ${n.nomor}`);
  L.push('', `🗓 ${fmtD(n.tanggal)}`);
  if (waktu(n)) L.push(`🕐 ${waktu(n)}`);
  if (n.tempat) L.push(`📍 ${n.tempat}`);
  if (n.pimpinan) L.push(`👤 Pimpinan: ${n.pimpinan}`);
  if (n.notulis) L.push(`✍️ Notulis: ${n.notulis}`);
  if ((n.peserta || []).length) {
    L.push(`👥 Hadir: ${hadirCount(n)} dari ${n.peserta.length} peserta`);
    ['Izin', 'Sakit', 'Alpa'].forEach(st => { const x = n.peserta.filter(p => p.status === st).map(p => p.nama); if (x.length) L.push(`   _${st}: ${x.join(', ')}_`); });
  }
  if ((n.agenda || []).length) L.push('', '*Agenda*', ...n.agenda.map((a, i) => `${i + 1}. ${a}`));
  if (n.pembahasan) L.push('', '*Pembahasan*', n.pembahasan);
  if ((n.keputusan || []).length) L.push('', '*Keputusan*', ...n.keputusan.map((k, i) => `${i + 1}. ${k}`));
  if ((n.tindak || []).length) L.push('', '*Tindak Lanjut*', ...n.tindak.map(t => `▪️ ${t.tugas}${t.pic || t.tenggat ? ` (${[t.pic, t.tenggat ? 'tenggat ' + fmtShort(t.tenggat) : ''].filter(Boolean).join(', ')})` : ''}${t.selesai ? ' ✅' : ''}`));
  const b = n.berikutnya || {};
  if (b.tanggal || b.waktu || b.tempat) L.push('', '*Rapat Berikutnya*', [b.tanggal ? fmtD(b.tanggal) : '', b.waktu ? b.waktu + ' WIB' : '', b.tempat].filter(Boolean).join(' • '));
  if (n.catatan) L.push('', '*Catatan*', n.catatan);
  L.push('', sep, `_Notulen ${settings.nama}_`);
  return L.join('\n');
}

function doPrint(n) {
  const old = document.title;
  document.title = `Notulen - ${n.judul} - ${n.tanggal}`;
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}

function normNum(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

function openWA(n) {
  const dlg = $('#waDialog');
  $('#waNum').value = settings.wa || '';
  $('#waText').value = waText(n);
  $('#waShare').style.display = navigator.share ? '' : 'none';
  $('#waSend').onclick = () => {
    const num = normNum($('#waNum').value);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent($('#waText').value)}`, '_blank', 'noopener');
  };
  $('#waShare').onclick = () => navigator.share({ title: n.judul, text: $('#waText').value }).catch(() => {});
  $('#waCopy').onclick = () => copyText($('#waText').value);
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

function viewDoc(id) {
  const n = notes.find(x => x.id === id);
  if (!n) { toast('Notulen tidak ditemukan'); location.hash = '#/'; return; }
  app.innerHTML = `
    <div class="toolbar no-print">
      <a class="btn ghost sm" href="#/">← Kembali</a>
      <button class="btn sm" id="bPrint">🖨 Cetak / PDF</button>
      <button class="btn wa sm" id="bWA">Kirim WhatsApp</button>
      <a class="btn ghost sm" href="#/edit/${n.id}">Edit</a>
      <button class="btn ghost sm" id="bCopy">Salin teks</button>
      <button class="btn ghost sm" id="bDup">Duplikat</button>
      <button class="btn danger sm" id="bDel">Hapus</button>
    </div>
    <p class="hint no-print">Simpan sebagai PDF: tekan <b>Cetak / PDF</b>, lalu pilih “Simpan sebagai PDF” pada pilihan printer.</p>
    <article id="doc" class="paper">${docHTML(n)}</article>`;
  $('#bPrint').onclick = () => doPrint(n);
  $('#bWA').onclick = () => openWA(n);
  $('#bCopy').onclick = () => copyText(waText(n));
  $('#bDup').onclick = () => {
    const d = clone(n); d.id = uid(); d.judul += ' (salinan)'; d.tanggal = todayStr(); d.nomor = nextNomor(d.tanggal);
    d.status = 'draft'; d.dibuat = d.diubah = Date.now(); d.tindak = (d.tindak || []).map(t => ({ ...t, selesai: false }));
    notes.unshift(d); saveNotes(); toast('Notulen diduplikat'); location.hash = '#/edit/' + d.id;
  };
  $('#bDel').onclick = () => {
    if (confirm(`Hapus notulen "${n.judul}"? Tindakan ini tidak bisa dibatalkan.`)) {
      notes = notes.filter(x => x.id !== n.id); saveNotes(); toast('Notulen dihapus'); location.hash = '#/';
    }
  };
}

/* ===================== Pengaturan ===================== */
function readLogo(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 240 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/png'));
      };
      img.onerror = rej; img.src = r.result;
    };
    r.onerror = rej; r.readAsDataURL(file);
  });
}

function viewSettings() {
  const s = settings; let logo = s.logo;
  app.innerHTML = `
  <form id="sf" class="form" autocomplete="off">
    <div class="pagehead"><h2>Pengaturan</h2></div>
    <section class="card">
      <h3>Identitas Madrasah (kop notulen)</h3>
      <label>Nama madrasah<input name="nama" required value="${esc(s.nama)}"></label>
      <label>Nama yayasan / naungan (opsional)<input name="yayasan" value="${esc(s.yayasan)}"></label>
      <label>Alamat<input name="alamat" value="${esc(s.alamat)}"></label>
      <label>Kontak (telepon / email)<input name="kontak" value="${esc(s.kontak)}"></label>
      <div class="grid2">
        <label>Kota (untuk tanda tangan)<input name="kota" value="${esc(s.kota)}"></label>
        <label>Singkatan nomor surat<input name="singkatan" value="${esc(s.singkatan)}"></label>
      </div>
      <div class="grid2">
        <label>Kepala madrasah<input name="kepala" value="${esc(s.kepala)}"></label>
        <label>NIP kepala (opsional)<input name="nipKepala" value="${esc(s.nipKepala)}"></label>
      </div>
      <label>Logo (opsional)<input type="file" id="logoFile" accept="image/*"></label>
      <div id="logoBox">${logo ? `<img class="logo-prev" src="${esc(logo)}" alt=""><button type="button" class="btn sm ghost" id="logoDel">Hapus logo</button>` : ''}</div>
    </section>
    <section class="card">
      <h3>WhatsApp</h3>
      <label>Nomor/Grup default (opsional)<input name="wa" inputmode="tel" value="${esc(s.wa)}" placeholder="08xxxxxxxxxx"></label>
      <p class="hint">Dikosongkan = Anda memilih sendiri kontak atau grup saat WhatsApp terbuka. Pengiriman ke <b>grup</b> selalu lewat pilihan manual di WhatsApp.</p>
    </section>
    <section class="card">
      <h3>Daftar peserta tetap</h3>
      <label>Satu orang per baris, format: Nama | Jabatan
        <textarea name="master" rows="8" placeholder="Ust. Ahmad Fauzi, S.Pd | Waka Kurikulum&#10;Ustzh. Siti Aminah, S.Pd.I | Guru Fikih">${esc(s.master)}</textarea></label>
      <p class="hint">Dipakai tombol “Muat daftar tetap” di form notulen.</p>
    </section>
    <div class="btnrow"><button class="btn" type="submit">Simpan pengaturan</button></div>
  </form>

  <section class="card">
    <h3>Cadangan data</h3>
    <p class="hint">Data tersimpan di browser perangkat ini. Unduh cadangan secara berkala, terutama sebelum mengganti HP/membersihkan data browser. Gunakan Impor untuk memindahkan ke perangkat lain.</p>
    <div class="btnrow">
      <button class="btn sm" id="bExp">⬇ Ekspor cadangan (.json)</button>
      <button class="btn sm ghost" id="bImp">⬆ Impor cadangan</button>
      <button class="btn sm danger" id="bAll">Hapus semua data</button>
      <input type="file" id="impFile" accept="application/json,.json" hidden>
    </div>
    <p class="muted">${notes.length} notulen tersimpan.</p>
  </section>`;

  const box = () => {
    $('#logoBox').innerHTML = logo ? `<img class="logo-prev" src="${esc(logo)}" alt=""><button type="button" class="btn sm ghost" id="logoDel">Hapus logo</button>` : '';
    const d = $('#logoDel'); if (d) d.onclick = () => { logo = ''; box(); };
  };
  box();
  $('#logoFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { logo = await readLogo(f); box(); } catch { toast('Gambar tidak bisa dibaca'); } };

  $('#sf').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    ['nama', 'yayasan', 'alamat', 'kontak', 'kota', 'singkatan', 'kepala', 'nipKepala', 'wa', 'master'].forEach(k => settings[k] = f.elements[k].value.trim());
    settings.nama = settings.nama || DEFAULT_SETTINGS.nama; settings.singkatan = settings.singkatan || 'MA';
    settings.logo = logo;
    if (saveSettings()) { setBrand(); toast('Pengaturan disimpan'); }
  });

  $('#bExp').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'notulen-ash-shiddiiqi', versi: 1, diekspor: new Date().toISOString(), notes, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `notulen-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#bImp').onclick = () => $('#impFile').click();
  $('#impFile').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.notes)) throw new Error('format');
      if (!confirm(`Impor ${data.notes.length} notulen? Notulen dengan ID sama akan ditimpa; yang lain tetap ada.`)) return;
      const map = new Map(notes.map(n => [n.id, n]));
      data.notes.forEach(n => { if (n && n.id) map.set(n.id, { ...blankNote(), ...n }); });
      notes = [...map.values()]; saveNotes();
      if (data.settings && confirm('Impor juga pengaturan (identitas madrasah, logo, daftar peserta)?')) { settings = { ...DEFAULT_SETTINGS, ...data.settings }; saveSettings(); setBrand(); }
      toast('Impor berhasil'); viewSettings();
    } catch { toast('File cadangan tidak valid'); }
  };
  $('#bAll').onclick = () => {
    if (confirm('Hapus SEMUA notulen di perangkat ini? Pastikan sudah mengekspor cadangan.') && confirm('Yakin? Tindakan ini tidak bisa dibatalkan.')) {
      notes = []; saveNotes(); toast('Semua notulen dihapus'); viewSettings();
    }
  };
}

/* ===================== Mulai ===================== */
setBrand();
route();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
