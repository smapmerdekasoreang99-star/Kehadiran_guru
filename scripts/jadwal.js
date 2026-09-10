import { supabaseClient, isSupabaseConfigured } from "../assets/supabase-client.js?v=20260910b";
import { demoData } from "../assets/demo-data.js?v=20260910b";
import { isUnlocked, initLockUI } from "../assets/auth-gate.js?v=20260910b";

// ---------- State ----------
let state = {
    hari: "Senin",
    kelasId: "ALL",
    jadwal: [],
    guru: [],
    kelas: [],
    mapel: [],
    jam: [],
};

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

// ---------- Boot ----------
async function boot() {
    document.getElementById("notice").hidden = isSupabaseConfigured;
    initLockUI(() => renderTable());
    document.getElementById("addBtn").disabled = !isUnlocked();

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
        state.jam = (jam || []).filter((j) => j.keterangan !== "Tahsin");
    } else {
        state.guru = demoData.guru;
        state.kelas = demoData.kelas;
        state.mapel = demoData.mapel;
        state.jam = demoData.jam.filter((j) => j.keterangan !== "Tahsin");
    }

    populateKelasFilter();
    populateModalSelects();
    renderDayTabs();
    await loadJadwal();
}

function populateKelasFilter() {
    const sel = document.getElementById("kelasFilter");
    sel.innerHTML =
        `<option value="ALL">Semua kelas</option>` +
        state.kelas.map((k) => `<option value="${k.id}">${k.nama_kelas}</option>`).join("");
    sel.addEventListener("change", async (e) => {
        state.kelasId = e.target.value;
        await loadJadwal();
    });
}

function renderDayTabs() {
    const wrap = document.getElementById("dayTabs");
    wrap.innerHTML = HARI_LIST.map(
        (h) => `<button data-hari="${h}" class="${h === state.hari ? "active" : ""}">${h}</button>`
    ).join("");
    wrap.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", async () => {
            state.hari = btn.dataset.hari;
            renderDayTabs();
            await loadJadwal();
        });
    });
}

// ---------- Data loading ----------
async function loadJadwal() {
    if (isSupabaseConfigured) {
        let query = supabaseClient
            .from("jadwal_kbm")
            .select("id, hari, jam_ke, kelas_id, mapel_id, guru_id")
            .eq("hari", state.hari)
            .order("jam_ke");
        if (state.kelasId !== "ALL") query = query.eq("kelas_id", state.kelasId);
        const { data, error } = await query;
        if (error) {
            console.error(error);
            return;
        }
        state.jadwal = data;
    } else {
        state.jadwal = demoData.jadwal.filter(
            (r) =>
                r.hari === state.hari &&
                (state.kelasId === "ALL" || r.kelas_id === state.kelasId)
        );
    }
    renderTable();
}

// ---------- Lookups ----------
const namaGuru = (id) => state.guru.find((g) => g.id === id)?.nama || id;
const namaKelas = (id) => state.kelas.find((k) => k.id === id)?.nama_kelas || id;
const namaMapel = (id) => state.mapel.find((m) => m.id === id)?.nama_mapel || id;
const jamInfo = (jamKe) => state.jam.find((j) => j.jam_ke === Number(jamKe));

// ---------- Render table ----------
function renderTable() {
    document.getElementById("addBtn").disabled = !isUnlocked();

    const tbody = document.getElementById("jadwalBody");
    const empty = document.getElementById("emptyState");

    const rows = [...state.jadwal].sort((a, b) => a.jam_ke - b.jam_ke);

    if (rows.length === 0) {
        tbody.innerHTML = "";
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    const unlocked = isUnlocked();
    const disabledAttr = unlocked ? "" : "disabled";

    tbody.innerHTML = rows
        .map((r) => {
            const jam = jamInfo(r.jam_ke);
            const waktu = jam ? `${jam.mulai}–${jam.selesai}` : "";
            return `
        <tr>
          <td class="jam-cell">
            <span class="jam-ke">Jam ke-${r.jam_ke}</span>
            <span class="jam-waktu">${waktu}</span>
          </td>
          <td><span class="badge-kelas">${namaKelas(r.kelas_id)}</span></td>
          <td>${namaMapel(r.mapel_id)}</td>
          <td>${namaGuru(r.guru_id)}</td>
          <td>
            <div class="row-actions">
              <button class="btn-danger-text" ${disabledAttr} data-action="edit" data-id="${r.id}">Ubah</button>
              <button class="btn-danger-text" ${disabledAttr} data-action="delete" data-id="${r.id}">Hapus</button>
            </div>
          </td>
        </tr>`;
        })
        .join("");

    if (!unlocked) return;

    tbody.querySelectorAll('[data-action="edit"]').forEach((b) =>
        b.addEventListener("click", () => openModal(b.dataset.id))
    );
    tbody.querySelectorAll('[data-action="delete"]').forEach((b) =>
        b.addEventListener("click", () => openConfirmDelete(b.dataset.id))
    );
}

// ---------- Modal: tambah / ubah ----------
function populateModalSelects() {
    document.getElementById("fHari").innerHTML = HARI_LIST.map(
        (h) => `<option value="${h}">${h}</option>`
    ).join("");
    document.getElementById("fJam").innerHTML = state.jam
        .map((j) => `<option value="${j.jam_ke}">Jam ke-${j.jam_ke} (${j.mulai}–${j.selesai})</option>`)
        .join("");
    document.getElementById("fKelas").innerHTML = state.kelas
        .map((k) => `<option value="${k.id}">${k.nama_kelas}</option>`)
        .join("");
    document.getElementById("fMapel").innerHTML = state.mapel
        .map((m) => `<option value="${m.id}">${m.nama_mapel}</option>`)
        .join("");
    document.getElementById("fGuru").innerHTML = state.guru
        .map((g) => `<option value="${g.id}">${g.nama}</option>`)
        .join("");
}

let editingId = null;

function openModal(id) {
    editingId = id || null;
    const row = id ? state.jadwal.find((r) => r.id === id) : null;

    document.getElementById("modalTitle").textContent = id ? "Ubah Jadwal" : "Tambah Jadwal";
    document.getElementById("fHari").value = row ? row.hari : state.hari;
    document.getElementById("fJam").value = row ? row.jam_ke : state.jam[0]?.jam_ke;
    document.getElementById("fKelas").value = row ? row.kelas_id : state.kelas[0]?.id;
    document.getElementById("fMapel").value = row ? row.mapel_id : state.mapel[0]?.id;
    document.getElementById("fGuru").value = row ? row.guru_id : state.guru[0]?.id;

    document.getElementById("jadwalModal").hidden = false;
}

function closeModal() {
    document.getElementById("jadwalModal").hidden = true;
    editingId = null;
}

async function saveJadwal(e) {
    e.preventDefault();
    const payload = {
        hari: document.getElementById("fHari").value,
        jam_ke: Number(document.getElementById("fJam").value),
        kelas_id: document.getElementById("fKelas").value,
        mapel_id: document.getElementById("fMapel").value,
        guru_id: document.getElementById("fGuru").value,
    };

    if (isSupabaseConfigured) {
        if (editingId) {
            await supabaseClient.from("jadwal_kbm").update(payload).eq("id", editingId);
        } else {
            const newId = `J${Date.now()}`;
            await supabaseClient.from("jadwal_kbm").insert({ id: newId, ...payload });
        }
    } else {
        if (editingId) {
            const idx = demoData.jadwal.findIndex((r) => r.id === editingId);
            if (idx > -1) demoData.jadwal[idx] = { id: editingId, ...payload };
        } else {
            demoData.jadwal.push({ id: `J${Date.now()}`, ...payload });
        }
    }

    closeModal();
    await loadJadwal();
}

// ---------- Hapus ----------
let deletingId = null;

function openConfirmDelete(id) {
    deletingId = id;
    document.getElementById("confirmModal").hidden = false;
}

function closeConfirmDelete() {
    deletingId = null;
    document.getElementById("confirmModal").hidden = true;
}

async function doDelete() {
    if (!deletingId) return;
    if (isSupabaseConfigured) {
        await supabaseClient.from("jadwal_kbm").delete().eq("id", deletingId);
    } else {
        const idx = demoData.jadwal.findIndex((r) => r.id === deletingId);
        if (idx > -1) demoData.jadwal.splice(idx, 1);
    }
    closeConfirmDelete();
    await loadJadwal();
}

// ---------- Wire up static controls ----------
document.getElementById("addBtn").addEventListener("click", () => openModal(null));
document.getElementById("modalCancel").addEventListener("click", closeModal);
document.getElementById("jadwalForm").addEventListener("submit", saveJadwal);
document.getElementById("confirmCancel").addEventListener("click", closeConfirmDelete);
document.getElementById("confirmDelete").addEventListener("click", doDelete);

boot();
