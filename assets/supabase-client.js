// =========================================================
// Koneksi Supabase — Aplikasi Guru Pengganti
// SMA Plus Merdeka Soreang
// =========================================================
// Isi dua nilai di bawah ini dengan kredensial project Supabase Anda
// (Project Settings -> API -> Project URL & anon public key).
// Selama masih diisi placeholder, aplikasi otomatis berjalan
// dalam MODE PRATINJAU memakai data contoh, tanpa terhubung ke database.

const SUPABASE_URL = "https://jzxcnfetpjkltjjbglxz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9pl5IOJl-Vx0KEnHtCs3nA_ioZOkacq";

export const isSupabaseConfigured =
    !SUPABASE_URL.startsWith("ISI_") && !SUPABASE_ANON_KEY.startsWith("ISI_");

export const supabaseClient = isSupabaseConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
