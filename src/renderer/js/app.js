// ============================================================
// SystemBoost Pro - Main App Controller
// Page routing, theme management, global state
// ============================================================
const App = {
    currentPage: 'dashboard',
    pages: {
        dashboard: Dashboard,
        cleanup: CleanupPage,
        processes: ProcessesPage,
        startup: StartupPage,
        logs: LogsPage,
        settings: SettingsPage
    },
    modalCallback: null,

    init() {
        // Init notifications
        Notify.init();

        // Load saved theme
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);

        // Titlebar controls
        document.getElementById('btn-minimize')?.addEventListener('click', () => window.systemboost?.window.minimize());
        document.getElementById('btn-maximize')?.addEventListener('click', () => window.systemboost?.window.maximize());
        document.getElementById('btn-close')?.addEventListener('click', () => window.systemboost?.window.close());

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            // Update settings page toggle if visible
            const settingDark = document.getElementById('setting-dark');
            if (settingDark) settingDark.checked = next === 'dark';
        });

        // Gaming mode sidebar toggle
        const gamingToggle = document.querySelector('#gaming-toggle input');
        if (gamingToggle) {
            gamingToggle.addEventListener('change', async (e) => {
                try {
                    await window.systemboost.gaming.toggle(e.target.checked);
                    Notify.success(e.target.checked ? 'Gaming Mode On' : 'Gaming Mode Off',
                        e.target.checked ? 'High performance enabled' : 'Balanced mode restored');
                    const settingGaming = document.getElementById('setting-gaming');
                    if (settingGaming) settingGaming.checked = e.target.checked;
                } catch (err) { Notify.error('Error', err.message); }
            });

            // Load initial state
            window.systemboost?.gaming.status().then(s => { gamingToggle.checked = s.enabled; }).catch(() => {});
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.getAttribute('data-page');
                if (page) this.navigate(page);
            });
        });

        // Modal
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-confirm')?.addEventListener('click', () => {
            this.hideModal();
            if (this.modalCallback) this.modalCallback();
        });

        // Load dashboard
        this.navigate('dashboard');
    },

    navigate(page) {
        if (!this.pages[page]) return;

        // Destroy current page
        const currentPageObj = this.pages[this.currentPage];
        if (currentPageObj?.destroy) currentPageObj.destroy();

        // Update nav
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-page') === page);
        });

        // Render new page
        this.currentPage = page;
        const content = document.getElementById('content');
        content.innerHTML = this.pages[page].render();

        // Init page
        if (this.pages[page].init) {
            this.pages[page].init();
        }
    },

    showModal(icon, title, message, callback) {
        document.getElementById('modal-icon').textContent = icon;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-overlay').classList.add('visible');
        this.modalCallback = callback;
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.remove('visible');
        this.modalCallback = null;
    }
};

// Boot the app
document.addEventListener('DOMContentLoaded', () => App.init());
