// ============================================================
// SystemBoost Pro - File Cleaner Service
// Safe temp file scanning and cleanup
// ============================================================
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('./logger');

class Cleaner {
    constructor() {
        // Only target safe, well-known temp directories
        this.targetPaths = [
            process.env.TEMP,
            process.env.TMP,
            path.join(process.env.LOCALAPPDATA || '', 'Temp'),
            path.join(process.env.WINDIR || 'C:\\Windows', 'Temp'),
            path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'INetCache'),
            path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Explorer', 'thumbcache_*')
        ].filter(Boolean);

        // Never touch these
        this.protectedPaths = [
            'C:\\Windows\\System32',
            'C:\\Windows\\SysWOW64',
            'C:\\Program Files',
            'C:\\Program Files (x86)',
            process.env.USERPROFILE
        ];

        this.protectedExtensions = [
            '.exe', '.dll', '.sys', '.drv', '.ini', '.bat', '.cmd',
            '.reg', '.msi', '.com', '.scr'
        ];
    }

    _isSafePath(filePath) {
        const normalized = path.resolve(filePath).toLowerCase();
        for (const p of this.protectedPaths) {
            if (p && normalized.startsWith(p.toLowerCase()) && !normalized.includes('temp')) {
                return false;
            }
        }
        return true;
    }

    _isSafeToDelete(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (this.protectedExtensions.includes(ext)) return false;
        return this._isSafePath(filePath);
    }

    async scan() {
        logger.info('Starting temp file scan', 'cleaner');
        const results = {
            categories: {
                tempFiles: { files: [], size: 0, label: 'Temporary Files' },
                cache: { files: [], size: 0, label: 'Cache Files' },
                logs: { files: [], size: 0, label: 'Log Files' },
                thumbnails: { files: [], size: 0, label: 'Thumbnails' }
            },
            totalSize: 0,
            totalFiles: 0,
            scanTime: 0
        };

        const startTime = Date.now();

        for (const targetPath of this.targetPaths) {
            try {
                if (!targetPath || targetPath.includes('*')) continue;
                if (!fs.existsSync(targetPath)) continue;
                await this._scanDirectory(targetPath, results, 0, 3);
            } catch (err) {
                // Skip inaccessible directories
            }
        }

        // Also scan Recycle Bin size
        try {
            const rbSize = await this._getRecycleBinSize();
            results.categories.recycleBin = {
                files: [],
                size: rbSize,
                label: 'Recycle Bin',
                special: true
            };
            results.totalSize += rbSize;
        } catch { /* ignore */ }

        results.scanTime = Date.now() - startTime;
        results.totalFiles = Object.values(results.categories)
            .reduce((sum, cat) => sum + cat.files.length, 0);
        results.totalSize = Object.values(results.categories)
            .reduce((sum, cat) => sum + cat.size, 0);

        logger.success(`Scan complete: ${results.totalFiles} files, ${this._formatBytes(results.totalSize)}`, 'cleaner', {
            totalFiles: results.totalFiles,
            totalSize: results.totalSize,
            scanTimeMs: results.scanTime
        });

        return results;
    }

    async _scanDirectory(dirPath, results, depth, maxDepth) {
        if (depth > maxDepth) return;
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                try {
                    const fullPath = path.join(dirPath, entry.name);
                    if (entry.isFile()) {
                        if (!this._isSafeToDelete(fullPath)) continue;
                        const stat = fs.statSync(fullPath);
                        const ext = path.extname(entry.name).toLowerCase();
                        const category = this._categorizeFile(ext, fullPath);
                        if (results.categories[category]) {
                            results.categories[category].files.push({
                                path: fullPath,
                                name: entry.name,
                                size: stat.size,
                                modified: stat.mtime
                            });
                            results.categories[category].size += stat.size;
                        }
                    } else if (entry.isDirectory()) {
                        await this._scanDirectory(fullPath, results, depth + 1, maxDepth);
                    }
                } catch { /* skip inaccessible file */ }
            }
        } catch { /* skip inaccessible dir */ }
    }

    _categorizeFile(ext, filePath) {
        const logExts = ['.log', '.old', '.bak', '.dmp'];
        const cacheExts = ['.cache', '.tmp'];

        if (logExts.includes(ext)) return 'logs';
        if (cacheExts.includes(ext)) return 'cache';
        if (filePath.toLowerCase().includes('thumbcache') || 
            filePath.toLowerCase().includes('thumbnail')) return 'thumbnails';
        return 'tempFiles';
    }

    async clean(categories = null) {
        logger.info('Starting cleanup', 'cleaner', { categories });
        const scanResult = await this.scan();
        let cleaned = 0;
        let cleanedSize = 0;
        let errors = 0;

        const catsToClean = categories || Object.keys(scanResult.categories);

        for (const catKey of catsToClean) {
            const cat = scanResult.categories[catKey];
            if (!cat || cat.special) continue;

            for (const file of cat.files) {
                try {
                    fs.unlinkSync(file.path);
                    cleaned++;
                    cleanedSize += file.size;
                } catch {
                    errors++;
                }
            }
        }

        // Empty recycle bin if requested
        if (catsToClean.includes('recycleBin')) {
            try {
                await this._emptyRecycleBin();
            } catch { /* ignore */ }
        }

        const result = {
            filesDeleted: cleaned,
            sizeFreed: cleanedSize,
            sizeFreedFormatted: this._formatBytes(cleanedSize),
            errors
        };

        logger.success(`Cleanup complete: ${cleaned} files deleted, ${result.sizeFreedFormatted} freed`, 'cleaner', result);
        return result;
    }

    async _getRecycleBinSize() {
        return new Promise((resolve) => {
            exec('powershell -Command "(New-Object -ComObject Shell.Application).NameSpace(0x0a).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"', 
                { timeout: 10000 }, (err, stdout) => {
                    if (err) resolve(0);
                    else resolve(parseInt(stdout.trim()) || 0);
                });
        });
    }

    async _emptyRecycleBin() {
        return new Promise((resolve, reject) => {
            exec('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"',
                { timeout: 30000 }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

module.exports = new Cleaner();
