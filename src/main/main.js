// ============================================================
// SystemBoost Pro - Electron Main Process
// Window management, IPC handlers, tray icon
// ============================================================
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeTheme } = require('electron');
const path = require('path');

// Services
const monitor = require('./services/monitor');
const cleaner = require('./services/cleaner');
const processManager = require('./services/processManager');
const ramOptimizer = require('./services/ramOptimizer');
const startupManager = require('./services/startupManager');
const batteryService = require('./services/batteryService');
const healthScore = require('./services/healthScore');
const recommendations = require('./services/recommendations');
const scheduler = require('./services/scheduler');
const logger = require('./services/logger');

let mainWindow = null;
let tray = null;
let monitorInterval = null;
let isGamingMode = false;
let isSilentMode = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 640,
        frame: false,
        transparent: false,
        backgroundColor: '#0a0a1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        logger.info('Application started', 'system');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', (e) => {
        if (isSilentMode) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    // We'll use a simple approach without a custom icon file
    try {
        tray = new Tray(path.join(__dirname, '..', '..', 'assets', 'icon.png'));
    } catch {
        // If no icon, skip tray
        return;
    }

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open SystemBoost Pro', click: () => mainWindow?.show() },
        { label: 'Boost Now', click: () => runBoost() },
        { type: 'separator' },
        { label: 'Gaming Mode', type: 'checkbox', checked: isGamingMode, click: (item) => toggleGamingMode(item.checked) },
        { label: 'Silent Mode', type: 'checkbox', checked: isSilentMode, click: (item) => { isSilentMode = item.checked; } },
        { type: 'separator' },
        { label: 'Quit', click: () => { isSilentMode = false; app.quit(); } }
    ]);

    tray.setToolTip('SystemBoost Pro');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow?.show());
}

async function runBoost() {
    logger.info('Boost Now triggered', 'boost');
    
    const results = {
        ram: null,
        cleanup: null,
        processes: null,
        healthBefore: null,
        healthAfter: null
    };

    try {
        results.healthBefore = await healthScore.calculate();
        results.ram = await ramOptimizer.optimize();
        results.cleanup = await cleaner.clean(['tempFiles', 'cache', 'logs']);
        if (isGamingMode) {
            results.processes = await processManager.killBloatProcesses();
        }
        results.healthAfter = await healthScore.calculate();
        
        logger.success('Boost complete', 'boost', results);
    } catch (err) {
        logger.error('Boost failed', 'boost', { error: err.message });
    }

    return results;
}

async function toggleGamingMode(enabled) {
    isGamingMode = enabled;
    if (enabled) {
        await batteryService.enableGamingMode();
        await processManager.killBloatProcesses();
        logger.info('Gaming Mode enabled', 'modes');
    } else {
        await batteryService.setPowerPlan('balanced');
        logger.info('Gaming Mode disabled', 'modes');
    }
    return { enabled: isGamingMode };
}

// ============================================================
// IPC Handlers
// ============================================================
function registerIpcHandlers() {
    // Window controls
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.handle('window:close', () => mainWindow?.close());
    ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

    // Monitor
    ipcMain.handle('monitor:snapshot', () => monitor.getFullSnapshot());
    ipcMain.handle('monitor:systemInfo', () => monitor.getSystemInfo());
    ipcMain.handle('monitor:history', () => monitor.getHistory());

    // Health Score
    ipcMain.handle('health:calculate', () => healthScore.calculate());
    ipcMain.handle('health:history', () => healthScore.getHistory());

    // Cleaner
    ipcMain.handle('cleaner:scan', () => cleaner.scan());
    ipcMain.handle('cleaner:clean', (_e, categories) => cleaner.clean(categories));

    // Process Manager
    ipcMain.handle('processes:list', () => processManager.getProcessList());
    ipcMain.handle('processes:kill', (_e, pid, name) => processManager.killProcess(pid, name));
    ipcMain.handle('processes:killBloat', () => processManager.killBloatProcesses());
    ipcMain.handle('processes:stats', () => processManager.getProcessStats());

    // RAM
    ipcMain.handle('ram:optimize', () => ramOptimizer.optimize());
    ipcMain.handle('ram:status', () => ramOptimizer.getStatus());

    // Startup Manager
    ipcMain.handle('startup:list', () => startupManager.getStartupItems());
    ipcMain.handle('startup:disable', (_e, name, regPath) => startupManager.disableStartupItem(name, regPath));
    ipcMain.handle('startup:enable', (_e, name, regPath) => startupManager.enableStartupItem(name, regPath));

    // Battery
    ipcMain.handle('battery:status', () => batteryService.getStatus());
    ipcMain.handle('battery:powerPlan', () => batteryService.getCurrentPowerPlan());
    ipcMain.handle('battery:setPlan', (_e, mode) => batteryService.setPowerPlan(mode));

    // Recommendations
    ipcMain.handle('recommendations:get', () => recommendations.generate());

    // Scheduler
    ipcMain.handle('scheduler:getConfig', () => scheduler.getConfig());
    ipcMain.handle('scheduler:updateConfig', (_e, config) => scheduler.updateConfig(config));
    ipcMain.handle('scheduler:runNow', () => scheduler.runNow());

    // Boost
    ipcMain.handle('boost:run', () => runBoost());

    // Gaming Mode
    ipcMain.handle('gaming:toggle', (_e, enabled) => toggleGamingMode(enabled));
    ipcMain.handle('gaming:status', () => ({ enabled: isGamingMode }));

    // Logs
    ipcMain.handle('logs:recent', (_e, count, category) => logger.getRecentLogs(count, category));
    ipcMain.handle('logs:fromDisk', (_e, days) => logger.getLogsFromDisk(days));
    ipcMain.handle('logs:stats', () => logger.getStats());

    // Theme
    ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
}

// Real-time monitoring push to renderer
function startMonitorPush() {
    monitorInterval = setInterval(async () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                const snapshot = await monitor.getFullSnapshot();
                mainWindow.webContents.send('monitor:update', snapshot);
            } catch { /* skip on error */ }
        }
    }, 2000);
}

// ============================================================
// App Lifecycle
// ============================================================
app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
    createTray();
    startMonitorPush();
    scheduler.init();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (!isSilentMode) {
        if (monitorInterval) clearInterval(monitorInterval);
        scheduler.destroy();
        app.quit();
    }
});

app.on('before-quit', () => {
    if (monitorInterval) clearInterval(monitorInterval);
    scheduler.destroy();
    logger.info('Application shutting down', 'system');
});
