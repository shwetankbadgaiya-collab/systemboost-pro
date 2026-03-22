// ============================================================
// SystemBoost Pro - Preload Script
// Secure bridge between main and renderer processes
// ============================================================
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('systemboost', {
    // Window controls
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized')
    },

    // System Monitor
    monitor: {
        getSnapshot: () => ipcRenderer.invoke('monitor:snapshot'),
        getSystemInfo: () => ipcRenderer.invoke('monitor:systemInfo'),
        getHistory: () => ipcRenderer.invoke('monitor:history'),
        onUpdate: (callback) => {
            ipcRenderer.on('monitor:update', (_e, data) => callback(data));
        },
        removeUpdateListener: () => {
            ipcRenderer.removeAllListeners('monitor:update');
        }
    },

    // Health Score
    health: {
        calculate: () => ipcRenderer.invoke('health:calculate'),
        getHistory: () => ipcRenderer.invoke('health:history')
    },

    // Cleaner
    cleaner: {
        scan: () => ipcRenderer.invoke('cleaner:scan'),
        clean: (categories) => ipcRenderer.invoke('cleaner:clean', categories)
    },

    // Process Manager
    processes: {
        list: () => ipcRenderer.invoke('processes:list'),
        kill: (pid, name) => ipcRenderer.invoke('processes:kill', pid, name),
        killBloat: () => ipcRenderer.invoke('processes:killBloat'),
        stats: () => ipcRenderer.invoke('processes:stats')
    },

    // RAM Optimizer
    ram: {
        optimize: () => ipcRenderer.invoke('ram:optimize'),
        status: () => ipcRenderer.invoke('ram:status')
    },

    // Startup Manager
    startup: {
        list: () => ipcRenderer.invoke('startup:list'),
        disable: (name, regPath) => ipcRenderer.invoke('startup:disable', name, regPath),
        enable: (name, regPath) => ipcRenderer.invoke('startup:enable', name, regPath)
    },

    // Battery
    battery: {
        status: () => ipcRenderer.invoke('battery:status'),
        powerPlan: () => ipcRenderer.invoke('battery:powerPlan'),
        setPlan: (mode) => ipcRenderer.invoke('battery:setPlan', mode)
    },

    // AI Recommendations
    recommendations: {
        get: () => ipcRenderer.invoke('recommendations:get')
    },

    // Scheduler
    scheduler: {
        getConfig: () => ipcRenderer.invoke('scheduler:getConfig'),
        updateConfig: (config) => ipcRenderer.invoke('scheduler:updateConfig', config),
        runNow: () => ipcRenderer.invoke('scheduler:runNow')
    },

    // Boost
    boost: {
        run: () => ipcRenderer.invoke('boost:run')
    },

    // Gaming Mode
    gaming: {
        toggle: (enabled) => ipcRenderer.invoke('gaming:toggle', enabled),
        status: () => ipcRenderer.invoke('gaming:status')
    },

    // Logs
    logs: {
        recent: (count, category) => ipcRenderer.invoke('logs:recent', count, category),
        fromDisk: (days) => ipcRenderer.invoke('logs:fromDisk', days),
        stats: () => ipcRenderer.invoke('logs:stats')
    },

    // Theme
    theme: {
        get: () => ipcRenderer.invoke('theme:get')
    }
});
