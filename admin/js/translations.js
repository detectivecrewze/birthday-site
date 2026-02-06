/**
 * Internationalization (i18n) Module
 * Stores all UI strings for multi-language support.
 */

const translations = {
    en: {
        // Navigation & General
        brand_name: "Birthday Admin",
        wizard_subtitle: "Step-by-Step Setup Wizard",
        btn_preview: "Preview",
        btn_back: "Back",
        btn_next: "Next",
        btn_save: "Save Progress",
        btn_finish: "Finish & Submit",
        btn_add_emoji: "Add Emoji",
        step_progress: "Step {current} of {total}",
        notif_saved: "Progress saved successfully!",
        notif_error: "Something went wrong.",
        status_autosaved: "Draft saved at",

        // Welcome Modal
        welcome_title: "Happy Birthday!",
        welcome_subtitle: "Follow the step-by-step wizard to create your personalized Birthday experience.",
        welcome_step1_title: "Setup",
        welcome_step1_desc: "Choose your theme and personalize names.",
        welcome_step2_title: "Page Manager",
        welcome_step2_desc: "Add or remove pages to your journey.",
        welcome_step3_title: "Customize",
        welcome_step3_desc: "Fill in content for each page.",
        welcome_step4_title: "Preview & Submit",
        welcome_step4_desc: "Review your work and share when ready!",
        welcome_btn: "Got it, let's start!",
        welcome_footer: "Progress is saved automatically",

        // Preview Modal
        preview_title: "Live Preview",

        // Specific Page UI Labels
        pageman_title: "Build the Journey",
        pageman_desc: "Add chapters to this birthday celebration",
        pageman_btn_add: "Add New Page",
        pageman_empty: "No pages added yet. Click the button above to start!",

        // Confirmations
        confirm_delete: "Are you sure you want to delete this? This cannot be undone.",
        confirm_remove_page: "Are you sure you want to remove this page?",
    },
    id: {
        // Navigation & General
        brand_name: "Admin Birthday",
        wizard_subtitle: "Panduan Pengaturan Bertahap",
        btn_preview: "Pratinjau",
        btn_back: "Kembali",
        btn_next: "Lanjut",
        btn_save: "Simpan Progres",
        btn_finish: "Selesai & Kirim",
        btn_add_emoji: "Tambah Emoji",
        step_progress: "Langkah {current} dari {total}",
        notif_saved: "Progres berhasil disimpan!",
        notif_error: "Terjadi kesalahan.",
        status_autosaved: "Draft disimpan pukul",

        // Welcome Modal
        welcome_title: "Selamat Ulang Tahun!",
        welcome_subtitle: "Ikuti panduan ini untuk membuat kejutan ulang tahun yang super personal.",
        welcome_step1_title: "Pengaturan Utama",
        welcome_step1_desc: "Pilih tema dan atur nama kalian berdua.",
        welcome_step2_title: "Kelola Halaman",
        welcome_step2_desc: "Tambah atau hapus halaman dalam perjalanannya.",
        welcome_step3_title: "Isi Konten",
        welcome_step3_desc: "Isi cerita dan kenangan di setiap halaman.",
        welcome_step4_title: "Cek & Kirim",
        welcome_step4_desc: "Lihat hasil akhirnya dan kirim ke dia!",
        welcome_btn: "Siap, ayo mulai!",
        welcome_footer: "Progres kamu tersimpan otomatis",

        // Preview Modal
        preview_title: "Pratinjau Langsung",

        // Specific Page UI Labels
        pageman_title: "Bangun Perjalanan",
        pageman_desc: "Tambahkan bab untuk perayaan ulang tahun ini",
        pageman_btn_add: "Tambah Halaman Baru",
        pageman_empty: "Belum ada halaman. Klik tombol di atas untuk memulai!",

        // Confirmations
        confirm_delete: "Yakin ingin menghapus ini? Data tidak bisa dikembalikan.",
        confirm_remove_page: "Yakin ingin menghapus halaman ini?",
    }
};

/**
 * Translation Helper
 * @param {string} key - The key in translations dictionary
 * @param {object} params - Dynamic parameters (e.g. {current: 1})
 * @returns {string} - Translated text
 */
function t(key, params = {}) {
    // Get current language from state or default to English
    const lang = (window.state && state.configData && state.configData.adminLang) || 'en';

    let text = translations[lang] && translations[lang][key] ? translations[lang][key] : (translations['en'][key] || key);

    // Replace parameters
    Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
    });

    return text;
}

window.translations = translations;
window.t = t;
