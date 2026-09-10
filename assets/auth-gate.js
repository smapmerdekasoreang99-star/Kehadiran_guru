// =========================================================
// Gerbang PIN bersama — Guru Pengganti SMA Plus Merdeka Soreang
// Cukup 1 tombol "Buka Kunci Edit" per sesi browser (tab).
// Setelah PIN benar, seluruh tombol tambah/ubah/hapus di
// halaman manapun langsung aktif tanpa diminta PIN lagi,
// sampai tab ditutup atau kunci diaktifkan ulang secara manual.
//
// CATATAN: ini penghalang di sisi tampilan saja, bukan keamanan
// sungguhan — PIN tertulis di kode ini dan bisa dilihat lewat
// "View Source" browser. Untuk proteksi sungguhan perlu login
// Supabase Auth.
// =========================================================

const PIN_KODE = "merdeka2026";
const SESSION_KEY = "gp_unlocked";

export function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
}

function lock() {
    sessionStorage.removeItem(SESSION_KEY);
}

function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
}

// Pasang tombol kunci di header halaman + modal PIN.
// onChange dipanggil setiap status kunci berubah, supaya
// halaman bisa render ulang tombol aksi (aktif/nonaktif).
export function initLockUI(onChange) {
    const toggleBtn = document.getElementById("lockToggle");

    function render() {
        if (isUnlocked()) {
            toggleBtn.textContent = "🔓 Edit aktif — klik untuk kunci lagi";
            toggleBtn.classList.add("unlocked");
        } else {
            toggleBtn.textContent = "🔒 Buka Kunci Edit";
            toggleBtn.classList.remove("unlocked");
        }
    }

    toggleBtn.addEventListener("click", () => {
        if (isUnlocked()) {
            lock();
            render();
            onChange && onChange();
        } else {
            openPinModal(() => {
                unlock();
                render();
                onChange && onChange();
            });
        }
    });

    render();
}

function openPinModal(onSuccess) {
    const modal = document.getElementById("pinModal");
    const input = document.getElementById("pinInput");
    const error = document.getElementById("pinError");
    const form = document.getElementById("pinForm");
    const cancelBtn = document.getElementById("pinCancel");

    input.value = "";
    error.hidden = true;
    modal.hidden = false;
    input.focus();

    function submit(e) {
        e.preventDefault();
        if (input.value === PIN_KODE) {
            cleanup();
            modal.hidden = true;
            onSuccess();
        } else {
            error.hidden = false;
        }
    }

    function cancel() {
        cleanup();
        modal.hidden = true;
    }

    function cleanup() {
        form.removeEventListener("submit", submit);
        cancelBtn.removeEventListener("click", cancel);
    }

    form.addEventListener("submit", submit);
    cancelBtn.addEventListener("click", cancel);
}
