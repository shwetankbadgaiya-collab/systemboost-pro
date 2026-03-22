// ============================================================
// SystemBoost Pro - Toast Notification System
// ============================================================
class NotificationManager {
    constructor() {
        this.container = null;
    }

    init() {
        this.container = document.getElementById('toast-container');
    }

    show(title, message, type = 'info', duration = 4000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.setProperty('--toast-duration', `${duration}ms`);

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <div class="toast-progress"></div>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    }

    success(title, message) { return this.show(title, message, 'success'); }
    error(title, message) { return this.show(title, message, 'error'); }
    warning(title, message) { return this.show(title, message, 'warning'); }
    info(title, message) { return this.show(title, message, 'info'); }
}

window.Notify = new NotificationManager();
