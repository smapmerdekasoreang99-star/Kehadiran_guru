import { supabaseClient, isSupabaseConfigured } from "../assets/supabase-client.js?v=20260910f";
import { demoData, demoKetidakhadiran } from "../assets/demo-data.js?v=20260910f";
import { isUnlocked, initLockUI } from "../assets/auth-gate.js?v=20260910f";

// Tombol kunci dipasang paling pertama & terpisah, supaya tetap berfungsi
// walaupun ada bagian lain halaman yang gagal dimuat.
try {
    initLockUI(() => renderTable());
} catch (err) {
    console.error("Gagal memasang tombol kunci:", err);
}

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const HARI_FROM_JS_DAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Tanggal hari ini (waktu lokal) dalam format YYYY-MM-DD
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let state = {
    // Terhubung Supabase: hari ini. Mode pratinjau: Senin contoh agar data contoh muncul.
    tanggal: isSupabaseConfigured ? todayISO() : "2026-09-14",
    hari: "Senin",
    jadwal: [],
    ketidakhadiran: [],
    guru: [],
    kelas: [],
    mapel: [],
    jam: [],
};

async function boot() {
    document.getElementById("notice").hidden = isSupabaseConfigured;

    if (isSupabaseConfigured) {
        const [{ data: guru }, { data: kelas }, { data: mapel }, { data: jam }] =
            await Promise.all([
                supabaseClient.from("guru").select("id, nama").order("nama"),
                supabaseClient.from("kelas").select("id, nama_kelas").order("id"),
                supabaseClient.from("mapel").select("id, nama_mapel").order("nama_mapel"),
                supabaseClient.from("jam_pelajaran").select("*").order("jam_ke"),
            ]);
        state.guru = guru || [];
        state.kelas = kelas || [];
        state.mapel = mapel || [];
        state.jam = jam || [];
    } else {
        state.guru = demoData.guru;
        state.kelas = demoData.kelas;
        state.mapel = demoData.mapel;
        state.jam = demoData.jam;
    }

    const tanggalInput = document.getElementById("tanggalPicker");
    tanggalInput.value = state.tanggal;
    tanggalInput.addEventListener("change", async (e) => {
        state.tanggal = e.target.value;
        await loadForDate();
    });

    await loadForDate();
}

function hariFromTanggal(tanggalStr) {
    const d = new Date(tanggalStr + "T00:00:00");
    return HARI_FROM_JS_DAY[d.getDay()];
}

async function loadForDate() {
    state.hari = hariFromTanggal(state.tanggal);
    document.getElementById("hariLabel").textContent = state.hari;

    const weekendNotice = document.getElementById("weekendNotice");
    const card = document.getElementById("mainCard");

    if (!HARI_LIST.includes(state.hari)) {
        weekendNotice.hidden = false;
        card.hidden = true;
        return;
    }
    weekendNotice.hidden = true;
    card.hidden = false;

    if (isSupabaseConfigured) {
        const [{ data: jadwal }, { data: ketidakhadiran }] = await Promise.all([
            supabaseClient
                .from("jadwal_kbm")
                .select("id, hari, jam_ke, kelas_id, mapel_id, guru_id")
                .eq("hari", state.hari)
                .order("jam_ke"),
            supabaseClient
                .from("ketidakhadiran_guru")
                .select("*")
                .eq("tanggal", state.tanggal),
        ]);
        state.jadwal = jadwal || [];
        state.ketidakhadiran = ketidakhadiran || [];
    } else {
        state.jadwal = demoData.jadwal.filter((r) => r.hari === state.hari);
        state.ketidakhadiran = demoKetidakhadiran.filter((r) => r.tanggal === state.tanggal);
    }

    renderTable();
}

const namaGuru = (id) => state.guru.find((g) => g.id === id)?.nama || id;
const namaKelas = (id) => state.kelas.find((k) => k.id === id)?.nama_kelas || id;
const namaMapel = (id) => state.mapel.find((m) => m.id === id)?.nama_mapel || id;
const jamInfo = (jamKe) => state.jam.find((j) => j.jam_ke === Number(jamKe));
const catatanUntuk = (jadwalId) => state.ketidakhadiran.find((k) => k.jadwal_id === jadwalId);

const STATUS_LABEL = {
    ST: "Sakit dengan Tugas",
    STT: "Sakit tanpa Tugas",
    IT: "Ijin dengan Tugas",
    ITT: "Ijin tanpa Tugas",
    TK: "Tanpa Keterangan",
    HTTM: "Hadir tanpa Tatap Muka",
};
const STATUS_PERLU_KETERANGAN = ["ST", "IT", "HTTM"];

function renderTable() {
    const tbody = document.getElementById("body");
    const rows = [...state.jadwal].sort((a, b) => a.jam_ke - b.jam_ke);
    const unlocked = isUnlocked();
    const disabledAttr = unlocked ? "" : "disabled";

    tbody.innerHTML = rows
        .map((r) => {
            const jam = jamInfo(r.jam_ke);
            const waktu = jam ? `${jam.mulai}–${jam.selesai}` : "";
            const catatan = catatanUntuk(r.id);

            const statusCell = catatan
                ? `<span class="badge-status badge-${catatan.status.toLowerCase()}">${catatan.status}</span>
                   <span class="tugas-note">${STATUS_LABEL[catatan.status] || ""}</span>`
                : `<span class="badge-status badge-hadir">Hadir</span>`;

            const actionCell = catatan
                ? `<div class="row-actions">
                     <button class="btn-danger-text" ${disabledAttr} data-action="edit" data-jid="${r.id}">Ubah</button>
                     <button class="btn-danger-text" ${disabledAttr} data-action="clear" data-jid="${r.id}">Batalkan</button>
                   </div>`
                : `<button class="btn-mark" ${disabledAttr} data-action="mark" data-jid="${r.id}">Tandai Tidak Hadir</button>`;

            return `
        <tr>
          <td class="jam-cell">
            <span class="jam-ke">Jam ke-${r.jam_ke}</span>
            <span class="jam-waktu">${waktu}</span>
          </td>
          <td><span class="badge-kelas">${namaKelas(r.kelas_id)}</span></td>
          <td>${namaMapel(r.mapel_id)}</td>
          <td>${namaGuru(r.guru_id)}</td>
          <td>${statusCell}</td>
          <td>${actionCell}</td>
        </tr>`;
        })
        .join("");

    if (!unlocked) return;

    tbody.querySelectorAll('[data-action="mark"], [data-action="edit"]').forEach((b) =>
        b.addEventListener("click", () => openModal(b.dataset.jid))
    );
    tbody.querySelectorAll('[data-action="clear"]').forEach((b) =>
        b.addEventListener("click", () => clearCatatan(b.dataset.jid))
    );
}

// ---------- Modal ----------
let activeJadwalId = null;

function openModal(jadwalId) {
    activeJadwalId = jadwalId;
    const row = state.jadwal.find((r) => r.id === jadwalId);
    const catatan = catatanUntuk(jadwalId);

    document.getElementById("modalSubjudul").textContent =
        `${namaGuru(row.guru_id)} — ${namaMapel(row.mapel_id)} — ${namaKelas(row.kelas_id)}, Jam ke-${row.jam_ke}`;

    document.getElementById("fStatus").value = catatan ? catatan.status : "ST";
    document.getElementById("fKeteranganTugas").value = catatan ? catatan.keterangan_tugas || "" : "";
    toggleKeteranganField();

    document.getElementById("ketidakhadiranModal").hidden = false;
}

function closeModal() {
    document.getElementById("ketidakhadiranModal").hidden = true;
    activeJadwalId = null;
}

function toggleKeteranganField() {
    const status = document.getElementById("fStatus").value;
    document.getElementById("keteranganField").hidden = !STATUS_PERLU_KETERANGAN.includes(status);
}

async function saveCatatan(e) {
    e.preventDefault();
    const row = state.jadwal.find((r) => r.id === activeJadwalId);
    const payload = {
        jadwal_id: activeJadwalId,
        tanggal: state.tanggal,
        guru_id: row.guru_id,
        status: document.getElementById("fStatus").value,
        keterangan_tugas: document.getElementById("fKeteranganTugas").value || null,
    };

    if (isSupabaseConfigured) {
        await supabaseClient
            .from("ketidakhadiran_guru")
            .upsert(payload, { onConflict: "jadwal_id,tanggal" });
    } else {
        const idx = demoKetidakhadiran.findIndex(
            (k) => k.jadwal_id === activeJadwalId && k.tanggal === state.tanggal
        );
        if (idx > -1) demoKetidakhadiran[idx] = { ...demoKetidakhadiran[idx], ...payload };
        else demoKetidakhadiran.push({ id: `K${Date.now()}`, ...payload });
    }

    closeModal();
    await loadForDate();
}

async function clearCatatan(jadwalId) {
    if (isSupabaseConfigured) {
        await supabaseClient
            .from("ketidakhadiran_guru")
            .delete()
            .eq("jadwal_id", jadwalId)
            .eq("tanggal", state.tanggal);
    } else {
        const idx = demoKetidakhadiran.findIndex(
            (k) => k.jadwal_id === jadwalId && k.tanggal === state.tanggal
        );
        if (idx > -1) demoKetidakhadiran.splice(idx, 1);
    }
    await loadForDate();
}

// ---------- Pasang kontrol statis, lalu muat data ----------
try {
    document.getElementById("modalCancel").addEventListener("click", closeModal);
    document.getElementById("ketidakhadiranForm").addEventListener("submit", saveCatatan);
    document.getElementById("fStatus").addEventListener("change", toggleKeteranganField);
} catch (err) {
    console.error("Ada elemen halaman yang tidak ditemukan — kemungkinan HTML dan JS beda versi. Lakukan hard refresh (Ctrl+Shift+R).", err);
}

boot().catch((err) => console.error("Gagal memuat data halaman:", err));
