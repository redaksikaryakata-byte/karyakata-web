// ========================================
// KARYAKATA.ID — SUPABASE CLIENT & HELPERS
// ========================================

// Init Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// HELPER — FORMAT RUPIAH
// ========================================
function rp(n) {
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

// ========================================
// HELPER — GENERATE ORDER CODE
// Format: KYK-2026-91005-A7X2
// ========================================
function generateOrderCode() {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `KYK-${year}-${rand}-${suffix}`;
}

// ========================================
// HELPER — GENERATE SLUG
// ========================================
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ========================================
// INSERT — ORDER
// ========================================
async function insertOrder(orderData) {
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('insertOrder error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// INSERT — SUBMISSION
// ========================================
async function insertSubmission(data) {
    try {
        const { data: result, error } = await supabaseClient
            .from('submissions')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (err) {
        console.error('insertSubmission error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// INSERT — CONTACT
// ========================================
async function insertContact(data) {
    try {
        const { data: result, error } = await supabaseClient
            .from('contacts')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (err) {
        console.error('insertContact error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// INSERT — SUBSCRIBER
// ========================================
async function insertSubscriber(email) {
    try {
        const { data, error } = await supabaseClient
            .from('subscribers')
            .insert([{ email }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { success: true, message: 'Email sudah terdaftar' };
            }
            throw error;
        }
        return { success: true, data };
    } catch (err) {
        console.error('insertSubscriber error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// UPLOAD FILE — Generic
// ========================================
async function uploadFile(bucket, file, folder = '') {
    try {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return { success: true, path: data.path, url: urlData.publicUrl };
    } catch (err) {
        console.error('uploadFile error:', err);
        return { success: false, error: err.message };
    }
}

async function uploadPaymentProof(file, orderCode) {
    return uploadFile(CONFIG.BUCKET_PAYMENTS, file, orderCode);
}

async function uploadManuscript(file, submissionId) {
    return uploadFile(CONFIG.BUCKET_MANUSCRIPTS, file, submissionId);
}

async function uploadBookCover(file) {
    return uploadFile(CONFIG.BUCKET_COVERS, file, 'books');
}

async function uploadBlogCover(file) {
    return uploadFile('blog-covers', file, 'posts');
}

async function uploadPartnerLogo(file) {
    return uploadFile('partners-logo', file, 'logos');
}

async function uploadAuthorPhoto(file, email) {
    return uploadFile('author-photos', file, email || 'umum');
}

// ========================================
// GET — BOOKS
// ========================================
async function getBooks(filters = {}) {
    try {
        let query = supabaseClient
            .from('books')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (filters.genre && filters.genre !== 'all') {
            query = query.eq('genre', filters.genre);
        }

        if (filters.featured) {
            query = query.eq('is_featured', true);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('getBooks error:', err);
        return { success: false, error: err.message, data: [] };
    }
}

// ========================================
// GET — POSTS
// ========================================
async function getPosts(filters = {}) {
    try {
        let query = supabaseClient
            .from('posts')
            .select('*')
            .eq('is_published', true)
            .order('published_at', { ascending: false });

        if (filters.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('getPosts error:', err);
        return { success: false, error: err.message, data: [] };
    }
}

// ========================================
// GET — POST BY ID
// ========================================
async function getPostById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', id)
            .eq('is_published', true)
            .single();

        if (error) throw error;

        supabaseClient.rpc('increment_post_views', { post_id: id }).catch(() => {});

        return { success: true, data };
    } catch (err) {
        console.error('getPostById error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// AUTH — ADMIN
// ========================================
async function adminSignIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('adminSignIn error:', err);
        return { success: false, error: err.message };
    }
}

async function adminSignOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error('adminSignOut error:', error);
    return { success: !error };
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

// ========================================
// AUTH — AUTHOR (custom session via RPC)
// ========================================
const AUTHOR_TOKEN_KEY = 'karyakata_author_token';
const AUTHOR_EMAIL_KEY = 'karyakata_author_email';
const AUTHOR_NAME_KEY  = 'karyakata_author_name';

function getAuthorToken() {
    return localStorage.getItem(AUTHOR_TOKEN_KEY);
}

function setAuthorSession(token, email, nama) {
    localStorage.setItem(AUTHOR_TOKEN_KEY, token);
    localStorage.setItem(AUTHOR_EMAIL_KEY, email || '');
    localStorage.setItem(AUTHOR_NAME_KEY, nama || '');
}

function clearAuthorSession() {
    localStorage.removeItem(AUTHOR_TOKEN_KEY);
    localStorage.removeItem(AUTHOR_EMAIL_KEY);
    localStorage.removeItem(AUTHOR_NAME_KEY);
}

function isAuthorLoggedIn() {
    return !!getAuthorToken();
}

function getAuthorEmail() {
    return localStorage.getItem(AUTHOR_EMAIL_KEY) || '';
}

function getAuthorName() {
    return localStorage.getItem(AUTHOR_NAME_KEY) || '';
}

// --- Login author (Email + Password) ---
async function authorLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.rpc('author_login_password', {
            p_email: email,
            p_password: password
        });

        if (error) throw error;
        if (!data || !data.ok) {
            return { success: false, error: (data && data.error) || 'Email atau password salah.' };
        }

        setAuthorSession(data.token, data.email, data.nama);
        return { success: true, data };
    } catch (err) {
        console.error('authorLogin error:', err);
        return { success: false, error: err.message || 'Login gagal.' };
    }
}

// --- Ganti Password Author ---
async function authorChangePassword(oldPass, newPass) {
    const token = getAuthorToken();
    if (!token) return { ok: false, error: 'Belum login.' };
    try {
        const { data, error } = await supabaseClient.rpc('author_change_password', {
            p_token: token,
            p_old_password: oldPass,
            p_new_password: newPass
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('authorChangePassword error:', err);
        return { ok: false, error: err.message };
    }
}

// --- Logout author ---
async function authorLogout() {
    const token = getAuthorToken();
    if (token) {
        try {
            await supabaseClient.rpc('author_logout', { p_token: token });
        } catch (err) {
            console.warn('authorLogout warn:', err);
        }
    }
    clearAuthorSession();
    return { success: true };
}

// --- Validate session ---
async function authorValidate() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_validate_session', {
            p_token: token,
        });
        if (error) throw error;
        if (!data || !data.ok) {
            clearAuthorSession();
            return { success: false, error: (data && data.error) || 'Session tidak valid.' };
        }
        setAuthorSession(token, data.email, data.nama);
        return { success: true, data };
    } catch (err) {
        console.error('authorValidate error:', err);
        return { success: false, error: err.message };
    }
}

// --- Dashboard ---
async function authorGetDashboard() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_dashboard', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, ...data };
    } catch (err) {
        console.error('authorGetDashboard error:', err);
        return { success: false, error: err.message };
    }
}

// --- Books ---
async function authorGetBooks() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_books', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, books: data.books || [] };
    } catch (err) {
        console.error('authorGetBooks error:', err);
        return { success: false, error: err.message, books: [] };
    }
}

// --- Orders (untuk info DP/pelunasan) ---
async function authorGetOrders() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_orders', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, orders: data.orders || [] };
    } catch (err) {
        console.error('authorGetOrders error:', err);
        return { success: false, error: err.message, orders: [] };
    }
}

// --- Sales ---
async function authorGetSales(dari = null, sampai = null) {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_sales', {
            p_token: token,
            p_dari: dari,
            p_sampai: sampai,
        });
        if (error) throw error;
        return { success: data.ok, sales: data.sales || [] };
    } catch (err) {
        console.error('authorGetSales error:', err);
        return { success: false, error: err.message, sales: [] };
    }
}

// --- Royalti payouts ---
async function authorGetRoyalti() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_royalti', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, payouts: data.payouts || [] };
    } catch (err) {
        console.error('authorGetRoyalti error:', err);
        return { success: false, error: err.message, payouts: [] };
    }
}

// --- Request pelunasan ---
async function authorRequestPelunasan(orderId) {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_request_pelunasan', {
            p_token: token,
            p_order_id: orderId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('authorRequestPelunasan error:', err);
        return { success: false, error: err.message };
    }
}

// --- Notifications ---
async function authorGetNotifications() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_notifications', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, notifications: data.notifications || [], unread: data.unread || 0 };
    } catch (err) {
        console.error('authorGetNotifications error:', err);
        return { success: false, error: err.message, notifications: [], unread: 0 };
    }
}

async function authorMarkNotifRead(notifId) {
    const token = getAuthorToken();
    if (!token) return { success: false };

    try {
        const { data, error } = await supabaseClient.rpc('author_mark_notif_read', {
            p_token: token,
            p_notif_id: notifId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('authorMarkNotifRead error:', err);
        return { success: false, error: err.message };
    }
}

// --- Profil ---
async function authorGetProfile() {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_get_profile', {
            p_token: token,
        });
        if (error) throw error;
        return { success: data.ok, author: data.author };
    } catch (err) {
        console.error('authorGetProfile error:', err);
        return { success: false, error: err.message };
    }
}

async function authorUpdateProfile(payload) {
    const token = getAuthorToken();
    if (!token) return { success: false, error: 'Belum login.' };

    try {
        const { data, error } = await supabaseClient.rpc('author_update_profile', {
            p_token: token,
            p_nama: payload.nama || '',
            p_wa: payload.wa || '',
            p_kota: payload.kota || '',
            p_bio: payload.bio || '',
            p_rekening_bank: payload.rekening_bank || '',
            p_rekening_nama: payload.rekening_nama || '',
            p_rekening_nomor: payload.rekening_nomor || '',
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('authorUpdateProfile error:', err);
        return { success: false, error: err.message };
    }
}

// ========================================
// ADMIN — KONFIRMASI PEMBAYARAN
// ========================================
async function adminActivateDashboard(orderId, adminEmail, catatan = null) {
    const { data, error } = await supabaseClient.rpc('admin_activate_dashboard', {
        p_order_id: orderId,
        p_admin_email: adminEmail,
        p_catatan: catatan,
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function adminDeactivateDashboard(orderId, adminEmail, alasan = null) {
    const { data, error } = await supabaseClient.rpc('admin_deactivate_dashboard', {
        p_order_id: orderId,
        p_admin_email: adminEmail,
        p_alasan: alasan,
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function adminKonfirmasiDP(orderId, jumlahDp, buktiUrl = null, adminEmail = null, catatan = null) {
    const { data, error } = await supabaseClient.rpc('admin_konfirmasi_dp', {
        p_order_id: orderId,
        p_jumlah_dp: jumlahDp,
        p_bukti_url: buktiUrl,
        p_admin_email: adminEmail,
        p_catatan: catatan,
    });
    if (error) return { success: false, error: error.message };
    return data;
}
// ========================================
// ADMIN — GENERATE AUTHOR ACCESS (Langsung ke Tabel)
// ========================================
async function adminGenerateAuthorAccess(orderId, adminEmail, namaPenulis) {
    try {
        // 1. Ambil data order
        const { data: order, error: errOrder } = await supabaseClient
            .from('orders').select('*').eq('id', orderId).single();
        if (errOrder) throw errOrder;

        const email = order.email_pemesan.toLowerCase();
        
        // 2. Generate password acak 8 karakter
        const password = Math.random().toString(36).slice(-8);

        // 3. Cek apakah author sudah ada
        const { data: existingAuthor } = await supabaseClient
            .from('authors').select('*').eq('email', email).maybeSingle();

        let authError;
        if (!existingAuthor) {
            // Jika belum ada, insert baru
            const { error: insErr } = await supabaseClient.from('authors').insert({
                email: email,
                nama_penulis: namaPenulis,
                password_hash: password // Simpan plain text dulu, nanti diganti di DB
            });
            authError = insErr;
        } else {
            // Jika sudah ada, update password
            const { error: updErr } = await supabaseClient.from('authors')
                .update({ password_hash: password, updated_at: new Date().toISOString() })
                .eq('email', email);
            authErr = updErr;
        }

        if (authError) throw authError;

        // 4. Aktifkan dashboard di tabel orders
        await supabaseClient.from('orders')
            .update({ dashboard_aktif: true, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        return {
            ok: true,
            email: email,
            password: password,
            nama: namaPenulis
        };

    } catch (err) {
        console.error('adminGenerateAuthorAccess Error:', err);
        return { ok: false, error: err.message };
    }
}

// ---
async function adminKonfirmasiLunas(orderId, buktiUrl = null, adminEmail = null, catatan = null) {
    const { data, error } = await supabaseClient.rpc('admin_konfirmasi_lunas', {
        p_order_id: orderId,
        p_bukti_url: buktiUrl,
        p_admin_email: adminEmail,
        p_catatan: catatan,
    });
    if (error) return { success: false, error: error.message };
    return data;
}

// ========================================
// ADMIN — GET AUTHORS (Untuk Dropdown)
// ========================================
async function adminGetAuthors() {
    const { data, error } = await supabaseClient.rpc('admin_get_authors');
    if (error) return { success: false, error: error.message };
    return data;
}

// ========================================
// CHECK — Supabase Ready?
// ========================================
function isSupabaseReady() {
    return SUPABASE_URL && SUPABASE_ANON_KEY &&
           SUPABASE_URL !== 'YOUR_URL' && SUPABASE_ANON_KEY !== 'YOUR_KEY';
}

// ========================================
// PARTNERS
// ========================================
async function getPartners() {
    try {
        const { data, error } = await supabaseClient
            .from('partners')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err) {
        console.error('getPartners error:', err);
        return { success: false, error: err.message, data: [] };
    }
}

// ========================================
// AUTO-INJECT: LOGIN PENULIS DI NAVBAR PUBLIK
// ========================================
(function injectAuthorLoginBtn() {
    if (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/author/')) return;
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/karyakata/');
    if (isIndex) return;

    document.addEventListener('DOMContentLoaded', () => {
        const navBtns = document.querySelectorAll('nav a[href="kirim-naskah.html"]');
        navBtns.forEach(btn => {
            if (btn.classList.contains('btn-gold') && btn.parentElement.classList.contains('hidden')) {
                if (btn.previousElementSibling && btn.previousElementSibling.href.includes('author-login')) return;
                const loginBtn = document.createElement('a');
                loginBtn.href = 'author/author-login.html';
                loginBtn.className = 'text-sky-700 bg-sky-50 hover:bg-sky-100 px-5 py-2.5 rounded-full text-sm font-bold transition flex items-center gap-2';
                loginBtn.innerHTML = '<i class="fa-solid fa-user-pen"></i><span>Login Penulis</span>';
                btn.parentElement.insertBefore(loginBtn, btn);
            }
        });

        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            const mobileKirim = mobileMenu.querySelector('a[href="kirim-naskah.html"]');
            if (mobileKirim) {
                if (mobileKirim.previousElementSibling && mobileKirim.previousElementSibling.href.includes('author-login')) return;
                const mobileLogin = document.createElement('a');
                mobileLogin.href = 'author/author-login.html';
                mobileLogin.className = 'block text-center bg-sky-50 text-sky-700 px-5 py-3 rounded-xl text-sm font-bold mt-2';
                mobileLogin.innerHTML = '<i class="fa-solid fa-user-pen mr-1"></i> Login Penulis';
                mobileMenu.insertBefore(mobileLogin, mobileKirim);
            }
        }
    });
})();

// ========================================
// AUTO-INJECT: MENU ADMIN DI SIDEBAR
// ========================================
(function injectAdminMenu() {
    if (!window.location.pathname.includes('/admin/')) return;
    if (window.location.pathname.includes('admin-login.html')) return;

    document.addEventListener('DOMContentLoaded', () => {
        const nav = document.querySelector('nav');
        if (!nav) return;

        const orderLink = nav.querySelector('a[href="admin-order.html"]');
        if (!orderLink) return;

        const isDashboardPage = window.location.pathname.includes('admin-dashboard.html');
        const isKonfirmasiPage = window.location.pathname.includes('admin-konfirmasi.html');
        const isPenjualanPage = window.location.pathname.includes('admin-penjualan.html');

        // 0. Menu Dashboard (di atas Order)
        if (!nav.querySelector('a[href="admin-dashboard.html"]')) {
            const dashLink = document.createElement('a');
            dashLink.href = 'admin-dashboard.html';
            let baseClass = orderLink.className.replace('active', '').trim();
            dashLink.className = baseClass;
            if (isDashboardPage) {
                dashLink.classList.add('active');
                orderLink.classList.remove('active');
            }
            dashLink.innerHTML = '<i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>';
            orderLink.parentNode.insertBefore(dashLink, orderLink);
        }

        if (isKonfirmasiPage || isPenjualanPage) {
            orderLink.classList.remove('active');
            nav.querySelectorAll('.sidebar-link.active').forEach(el => {
                if (el.href !== window.location.href) el.classList.remove('active');
            });
        }

        // 1. Menu Konfirmasi
        if (!nav.querySelector('a[href="admin-konfirmasi.html"]')) {
            const newLink = document.createElement('a');
            newLink.href = 'admin-konfirmasi.html';
            let baseClass = orderLink.className.replace('active', '').trim();
            newLink.className = baseClass;
            if (isKonfirmasiPage) newLink.classList.add('active');
            newLink.innerHTML = '<i class="fa-solid fa-money-check-dollar"></i><span>Konfirmasi & Akses</span>';
            orderLink.parentNode.insertBefore(newLink, orderLink.nextSibling);
        }

        // 2. Menu Input Penjualan
        const konfirmasiLink = nav.querySelector('a[href="admin-konfirmasi.html"]');
        if (konfirmasiLink && !nav.querySelector('a[href="admin-penjualan.html"]')) {
            const salesLink = document.createElement('a');
            salesLink.href = 'admin-penjualan.html';
            let baseClass = orderLink.className.replace('active', '').trim();
            salesLink.className = baseClass;
            if (isPenjualanPage) salesLink.classList.add('active');
            salesLink.innerHTML = '<i class="fa-solid fa-chart-line"></i><span>Input Penjualan</span>';
            konfirmasiLink.parentNode.insertBefore(salesLink, konfirmasiLink.nextSibling);
        }
        
        // 3. Menu Data Penulis
        const isAuthorPage = window.location.pathname.includes('admin-author.html');
        if (isAuthorPage) {
            nav.querySelectorAll('.sidebar-link.active').forEach(el => el.classList.remove('active'));
        }
        const penjualanLink = nav.querySelector('a[href="admin-penjualan.html"]');
        if (penjualanLink && !nav.querySelector('a[href="admin-author.html"]')) {
            const authorLink = document.createElement('a');
            authorLink.href = 'admin-author.html';
            let baseClass = orderLink.className.replace('active', '').trim();
            authorLink.className = baseClass;
            if (isAuthorPage) authorLink.classList.add('active');
            authorLink.innerHTML = '<i class="fa-solid fa-users"></i><span>Data Penulis</span>';
            penjualanLink.parentNode.insertBefore(authorLink, penjualanLink.nextSibling);
        }
    });
})();

// ========================================
// SMOOTH MOBILE MENU ANIMATION (TAMBAHAN BARU)
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Kita pilih semua tombol burger yang umum dipakai
    const menuBtns = document.querySelectorAll('#menuBtn, #btnMenuMobile, #sidebarToggle');
    
    menuBtns.forEach(btn => {
        // Cari menu target berdasarkan tombol yang diklik
        let targetMenu = document.getElementById('mobileMenu');
        if (btn.id === 'sidebarToggle') targetMenu = document.getElementById('sidebar');

        if (btn && targetMenu) {
            // Hapus class 'hidden' bawaan agar kita bisa pakai animasi transisi CSS
            targetMenu.classList.remove('hidden');
            
            // Set styling dasar untuk animasi
            targetMenu.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            targetMenu.style.overflow = 'hidden';

            // Jika ini sidebar (bukan menu mobile), gunakan animasi geser kiri-kanan
            if (targetMenu.id === 'sidebar') {
                targetMenu.style.transform = 'translateX(-100%)';
                targetMenu.style.opacity = '0';
                
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = targetMenu.style.transform === 'translateX(0px)' || targetMenu.style.transform === '';
                    if (isOpen) {
                        targetMenu.style.transform = 'translateX(-100%)';
                        targetMenu.style.opacity = '0';
                        setTimeout(() => targetMenu.classList.add('hidden'), 300);
                    } else {
                        targetMenu.classList.remove('hidden');
                        targetMenu.style.transform = 'translateX(0)';
                        targetMenu.style.opacity = '1';
                    }
                });
            } 
            // Jika ini menu mobile biasa, gunakan animasi slide down (buka-tutup ke bawah)
            else {
                targetMenu.style.maxHeight = '0';
                targetMenu.style.opacity = '0';
                targetMenu.style.transform = 'translateY(-10px)';
                targetMenu.style.pointerEvents = 'none';

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = targetMenu.style.maxHeight !== '0px' && targetMenu.style.maxHeight !== '';

                    if (isOpen) {
                        targetMenu.style.maxHeight = '0';
                        targetMenu.style.opacity = '0';
                        targetMenu.style.transform = 'translateY(-10px)';
                        targetMenu.style.pointerEvents = 'none';
                    } else {
                        targetMenu.style.maxHeight = targetMenu.scrollHeight + 'px';
                        targetMenu.style.opacity = '1';
                        targetMenu.style.transform = 'translateY(0)';
                        targetMenu.style.pointerEvents = 'auto';
                    }
                });
            }

            // Tutup menu otomatis saat link di dalamnya diklik
            targetMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (targetMenu.id === 'sidebar') {
                        targetMenu.style.transform = 'translateX(-100%)';
                        targetMenu.style.opacity = '0';
                        setTimeout(() => targetMenu.classList.add('hidden'), 300);
                    } else {
                        targetMenu.style.maxHeight = '0';
                        targetMenu.style.opacity = '0';
                        targetMenu.style.transform = 'translateY(-10px)';
                        targetMenu.style.pointerEvents = 'none';
                    }
                });
            });
        }
    });
});

// Log
console.log('%c🗄️ Supabase client loaded', 'color: #0B7BE8; font-weight: bold;');