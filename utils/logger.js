// utils/logger.js
import { createWriteStream, promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { inspect } from 'util';
import os from 'os';
import { format } from 'date-fns';

const __dirname = dirname(fileURLToPath(import.meta.url));

class NexusLogger {
  constructor(config = {}) {
    this.config = {
      logDir: join(__dirname, '../../logs'),
      logFilePrefix: 'nexus',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      logLevels: ['error', 'warn', 'info', 'debug'],
      ...config
    };

    this.currentDate = format(new Date(), 'yyyy-MM-dd');
    this._initialize();
  }

  async _initialize() {
    await this._ensureLogDir();
    this._createLogStreams();
    this._setupCleanup();
  }

  async _ensureLogDir() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  _createLogStreams() {
    const basePath = join(this.config.logDir, this.config.logFilePrefix);
    
    this.streams = {
      info: this._createStream(`${basePath}-info-${this.currentDate}.log`),
      error: this._createStream(`${basePath}-error-${this.currentDate}.log`),
      debug: this._createStream(`${basePath}-debug-${this.currentDate}.log`)
    };
  }

  _createStream(filePath) {
    return createWriteStream(filePath, { 
      flags: 'a',
      encoding: 'utf8'
    });
  }

  _setupCleanup() {
    process.on('beforeExit', () => this.close());
    setInterval(() => this._rotateLogs(), 86400000); // Daily rotation
  }

  async _rotateLogs() {
    if (format(new Date(), 'yyyy-MM-dd') !== this.currentDate) {
      await this.close();
      this.currentDate = format(new Date(), 'yyyy-MM-dd');
      this._createLogStreams();
    }
  }

  // ========== Public API ==========
  log(level, message, data) {
    if (!this.config.logLevels.includes(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      pid: process.pid,
      message,
      ...this._parseData(data)
    };

    this._writeLog(level, entry);
    this._consoleLog(level, entry);
  }

  error(message, error) {
    const errorId = createHash('sha1')
      .update(Date.now().toString())
      .digest('hex')
      .substring(0, 8);

    this.log('error', message, {
      error: this._parseError(error),
      errorId
    });

    return errorId;
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  // ========== Utility Methods ==========
  _parseData(data) {
    if (!data) return {};
    if (data instanceof Error) return { error: this._parseError(data) };
    if (typeof data === 'object') return { data: this._sanitizeObject(data) };
    return { data };
  }

  _parseError(error) {
    return {
      type: error?.constructor?.name || 'Error',
      message: error?.message || String(error),
      stack: error?.stack?.split('\n'),
      ...(error?.code && { code: error.code })
    };
  }

  _sanitizeObject(obj) {
    return JSON.parse(JSON.stringify(obj, (_, value) => {
      if (value instanceof Error) return this._parseError(value);
      if (typeof value === 'bigint') return value.toString();
      return value;
    }));
  }

  _writeLog(level, entry) {
    const stream = this.streams[level] || this.streams.info;
    stream.write(JSON.stringify(entry) + os.EOL);
  }

  _consoleLog(level, entry) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m', // Yellow
      info: '\x1b[36m', // Cyan
      debug: '\x1b[35m' // Magenta
    };

    console[level](
      `${colors[level] || ''}[${entry.timestamp}] [${entry.level}] ${entry.message}`,
      inspect(entry.data || entry.error, { colors: true, depth: 5 })
    );
  }

  async close() {
    await Promise.all(
      Object.values(this.streams).map(stream => 
        new Promise(resolve => stream.end(resolve))
      )
    );
  }
}

// Singleton instance
export const logger = new NexusLogger({
  logLevels: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn', 'info'] 
    : ['error', 'warn', 'info', 'debug']
});

// Utility exports
export const createLogger = (config) => new NexusLogger(config);