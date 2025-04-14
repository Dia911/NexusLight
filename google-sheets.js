// google-sheets.js - Phiên bản ESM dùng config.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import logger from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { SHEET_ID, serviceAccount } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleSheets {
  constructor() {
    this.doc = new GoogleSpreadsheet(SHEET_ID);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.doc.useServiceAccountAuth({
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key
      });

      await this.doc.loadInfo();
      this.initialized = true;
      logger.info('Google Sheets initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async log(data) {
    try {
      await this.init();
      const sheet = this.doc.sheetsByIndex[0];

      const rowData = {
        'Timestamp': new Date().toISOString(),
        'Platform': data.platform || 'N/A',
        'User ID': data.userId || 'N/A',
        'Message': data.message?.substring(0, 100) || 'N/A',
        'Action': data.action || 'N/A',
        'Status': data.status || 'processed',
        'Metadata': JSON.stringify({
          ip: data.ip,
          userAgent: data.userAgent
        })
      };

      await sheet.addRow(rowData);

      logger.info(`Logged to Google Sheets: ${data.platform}`, {
        userId: data.userId,
        action: data.action
      });

      return { success: true, rowData };
    } catch (error) {
      logger.error('Google Sheets logging failed', {
        error: error.message,
        stack: error.stack,
        inputData: {
          platform: data.platform,
          userId: data.userId
        }
      });

      return {
        success: false,
        error: error.message,
        code: 'GSHEETS_ERROR'
      };
    }
  }

  async logStartup() {
    return this.log({
      platform: 'system',
      action: 'server_startup',
      status: 'success',
      timestamp: new Date().toISOString()
    });
  }

  async readLastRecords(limit = 10) {
    try {
      await this.init();
      const sheet = this.doc.sheetsByIndex[0];
      const rows = await sheet.getRows({ limit });

      return rows.map(row => ({
        timestamp: row.Timestamp,
        platform: row.Platform,
        userId: row['User ID'],
        action: row.Action
      }));
    } catch (error) {
      logger.error('Failed to read Google Sheets', error);
      throw error;
    }
  }
}

const googleSheets = new GoogleSheets();

(async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      await googleSheets.init();
    }
  } catch (error) {
    logger.error('Google Sheets pre-init failed', error);
  }
})();

export default googleSheets;
