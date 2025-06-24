import { connect } from 'puppeteer-real-browser';
import { createLogger, format, transports } from 'winston';
import { getBrowserDebugInfo } from './bitbrowser.js';
import { LOGGER_CONFIG, PUPPETEER_CONFIG } from '../config/config.js';

// 配置日志
const logger = createLogger({
  level: LOGGER_CONFIG.level,
  format: format.combine(
    format.timestamp(LOGGER_CONFIG.format.timestamp),
    format.printf(LOGGER_CONFIG.format.printf)
  ),
  transports: [new transports.Console()]
});

class PuppeteerController {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * 连接到比特浏览器
   * @param {string} browserId - 比特浏览器ID
   * @param {Object} [options] - 连接选项
   */
  async connectToBitBrowser(browserId, options = {}) {
    try {
      // 获取比特浏览器调试信息
      const debugInfo = await getBrowserDebugInfo(browserId);
      
      if (!debugInfo) {
        throw new Error('Failed to get browser debug info');
      }
      
      // 合并默认配置和用户配置
      const config = {
        ...PUPPETEER_CONFIG,
        ...options,
        connectOption: {
          ...PUPPETEER_CONFIG.connectOption,
          ...(options.connectOption || {})
        }
      };
      
      // 使用puppeteer-real-browser的connect方法连接到比特浏览器
      const { browser, page } = await connect({
        ...config,
        browserWSEndpoint: debugInfo.debuggerAddress
      });
      
      this.browser = browser;
      this.page = page;
      
      logger.info('Connected to BitBrowser');
      return { browser, page };
    } catch (error) {
      logger.error(`Error connecting to BitBrowser: ${error.message}`);
      throw error;
    }
  }

  /**
   * 导航到URL
   * @param {string} url - 要导航的URL
   * @param {Object} options - 导航选项
   */
  async navigateTo(url, options = {}) {
    try {
      if (!this.page) {
        throw new Error('No page available');
      }
      
      const defaultOptions = {
        waitUntil: 'networkidle2',
        timeout: 30000
      };
      
      await this.page.goto(url, { ...defaultOptions, ...options });
      logger.info(`Navigated to: ${url}`);
    } catch (error) {
      logger.error(`Error navigating to ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 在页面上执行JavaScript
   * @param {Function|string} pageFunction - 要执行的函数或JavaScript字符串
   * @param  {...any} args - 传递给函数的参数
   * @returns {Promise<any>} - 执行结果
   */
  async evaluate(pageFunction, ...args) {
    try {
      if (!this.page) {
        throw new Error('No page available');
      }
      
      return await this.page.evaluate(pageFunction, ...args);
    } catch (error) {
      logger.error(`Error evaluating JavaScript: ${error.message}`);
      throw error;
    }
  }

  /**
   * 截图
   * @param {Object} options - 截图选项
   * @returns {Promise<Buffer>} - 截图数据
   */
  async takeScreenshot(options = {}) {
    try {
      if (!this.page) {
        throw new Error('No page available');
      }
      
      const defaultOptions = {
        fullPage: true
      };
      
      const screenshot = await this.page.screenshot({ ...defaultOptions, ...options });
      logger.info('Screenshot taken');
      return screenshot;
    } catch (error) {
      logger.error(`Error taking screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('Browser closed');
      }
    } catch (error) {
      logger.error(`Error closing browser: ${error.message}`);
      throw error;
    }
  }
}

const puppeteerController = new PuppeteerController();
export default puppeteerController;
