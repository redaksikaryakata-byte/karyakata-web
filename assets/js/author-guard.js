// ========================================
// KARYAKATA.ID — AUTHOR GUARD
// Letakkan di halaman author SEBELUM script halaman
// ========================================

(async function authorGuard() {
    // Kalau tidak ada token → langsung redirect
    if (!isAuthorLoggedIn()) {
        window.location.replace('author-login.html');
        return;
    }

    // Validasi ke server
    const result = await authorValidate();

    if (!result.success) {
        // Token kadaluarsa / invalid
        clearAuthorSession();
        window.location.replace('author-login.html');
        return;
    }

    // Expose data author ke window
    window.__author = {
        email: result.data.email,
        nama: result.data.nama,
        order_code: result.data.order_code,
    };
})();