import { connect } from 'puppeteer-real-browser';
import { createLogger, format, transports } from 'winston';
import { getBrowserDebugInfo, generatePuppeteerRealBrowserConfig } from './bitbrowser.js';
import { LOGGER_CONFIG, PUPPETEER_REAL_BROWSER_CONFIG, TEMP_FILES_CONFIG } from '../config/config.js';
import fse from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 临时文件目录
const TEMP_DIR = join(__dirname, '../temp');

// 确保临时目录存在
fse.ensureDirSync(TEMP_DIR);


const logger = createLogger({
  level: LOGGER_CONFIG.level,
  format: format.combine(
    format.timestamp(LOGGER_CONFIG.format.timestamp),
    format.printf(LOGGER_CONFIG.format.printf)
  ),
  transports: [new transports.Console()]
});

/**
 * 清理临时文件
 */
function cleanupTempFiles() {
  try {
    if (fse.existsSync(TEMP_FILES_CONFIG.configFilePath)) {
      fse.unlinkSync(TEMP_FILES_CONFIG.configFilePath);
      logger.debug('已清理配置文件');
    }
    if (fse.existsSync(TEMP_FILES_CONFIG.wsEndpointFilePath)) {
      fse.unlinkSync(TEMP_FILES_CONFIG.wsEndpointFilePath);
      logger.debug('已清理WebSocket端点文件');
    }
  } catch (error) {
    logger.error(`清理临时文件时出错: ${error.message}`, {
      stack: error.stack,
      location: 'puppeteer.js:cleanupTempFiles'
    });
  }
}

// 注册进程退出事件
process.on('exit', cleanupTempFiles);
process.on('SIGINT', () => {
  cleanupTempFiles();
  process.exit(1);
});

// 定时清理临时文件
setInterval(cleanupTempFiles, TEMP_FILES_CONFIG.cleanupInterval);

class PuppeteerController {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * 连接到比特浏览器
   * @param {string} browserId - 比特浏览器ID
   * @param {Object} [options] - 连接选项
   * @returns {Promise<{browser: Browser, page: Page}>} - 浏览器和页面实例
   */
  async connectToBitBrowser(browserId, options = {}) {
    try {
      // 获取比特浏览器调试信息
      const debugInfo = await getBrowserDebugInfo(browserId);
      
      if (!debugInfo || !debugInfo.debuggerAddress) {
        throw new Error('无法获取浏览器调试信息或调试地址');
      }
      
      logger.info(`调试地址: ${debugInfo.debuggerAddress}`);
      
      // 合并默认配置和用户配置
      const config = {
        ...PUPPETEER_REAL_BROWSER_CONFIG,
        ...options,
        connectOption: {
          ...PUPPETEER_REAL_BROWSER_CONFIG.connectOption,
          ...(options.connectOption || {})
        }
      };
      
      let wsEndpoint = debugInfo.debuggerAddress;
      try {
        const httpEndpoint = wsEndpoint.replace('ws://', 'http://').replace('wss://', 'https://');
        const wsDebugUrlResponse = await fetch(`${httpEndpoint}/json/version`);
        const wsDebugUrlData = await wsDebugUrlResponse.json();
        
        if (wsDebugUrlData && wsDebugUrlData.webSocketDebuggerUrl) {
          wsEndpoint = wsDebugUrlData.webSocketDebuggerUrl;
          logger.info(`从HTTP端点获取到WebSocket调试URL: ${wsEndpoint}`);
        } else {
          logger.warn('无法从HTTP端点获取WebSocket调试URL，使用默认端点');
        }
      } catch (httpError) {
        logger.warn(`尝试从HTTP端点获取WebSocket调试URL时出错: ${httpError.message}`);
        logger.warn('使用默认WebSocket端点');
      }
      
      if (!wsEndpoint.startsWith('ws://') && !wsEndpoint.startsWith('wss://')) {
        wsEndpoint = `ws://${wsEndpoint}`;
        logger.info(`添加'ws://'前缀到WebSocket端点: ${wsEndpoint}`);
      }
      
      // 创建修改后的connect函数，使用已存在的浏览器实例
      const connectOptions = {
        ...config,
        // 禁用Xvfb
        disableXvfb: true,
        // 禁用Chrome启动
        ignoreAllFlags: true,
        // 直接使用WebSocket端点连接
        connectOption: {
          ...config.connectOption,
          browserWSEndpoint: wsEndpoint,
          browserURL: undefined // undefined，确保只使用browserWSEndpoint
        }
      };
      
      logger.info(`使用以下选项连接到浏览器: ${JSON.stringify(connectOptions, null, 2)}`);
      
      // 使用puppeteer-real-browser连接到已存在的浏览器实例
      const { browser, page } = await connect(connectOptions);
      
      this.browser = browser;
      this.page = page;
      
      logger.info('成功连接到比特浏览器');
      return { browser, page };
    } catch (error) {
      logger.error(`连接到比特浏览器时出错: ${error.message}`, {
        stack: error.stack,
        location: 'puppeteer.js:connectToBitBrowser'
      });
      
      // 尝试提供更具体的错误信息
      if (error.message.includes('404')) {
        logger.error('错误404表明WebSocket连接被拒绝。这可能是因为:');
        logger.error('1. 比特浏览器调试端口未正确暴露');
        logger.error('2. WebSocket URL格式不正确');
        logger.error('3. 比特浏览器版本与puppeteer-real-browser不兼容');
        logger.error('4. 比特浏览器可能已经关闭或崩溃');
      }
      
      throw error;
    }
  }

  /**
   * 导航到URL
   * @param {string} url - 要导航的URL
   * @param {Object} options - 导航选项
   * @returns {Promise<void>}
   */
  async navigateTo(url, options = {}) {
    try {
      if (!this.page) {
        throw new Error('没有可用的页面');
      }
      
      const defaultOptions = {
        waitUntil: 'networkidle2',
        timeout: 30000
      };
      
      await this.page.goto(url, { ...defaultOptions, ...options });
      logger.info(`已导航到: ${url}`);
    } catch (error) {
      logger.error(`导航到 ${url} 时出错: ${error.message}`, {
        stack: error.stack,
        location: 'puppeteer.js:navigateTo'
      });
      throw error;
    }
  }

  /**
   * 在页面上执行JavaScript
   * @param {Function|string} pageFunction - 要执行的函数或JavaScript字符串
   * @param {...any} args - 传递给函数的参数
   * @returns {Promise<any>} - 执行结果
   */
  async evaluate(pageFunction, ...args) {
    try {
      if (!this.page) {
        throw new Error('没有可用的页面');
      }
      
      return await this.page.evaluate(pageFunction, ...args);
    } catch (error) {
      logger.error(`执行JavaScript时出错: ${error.message}`, {
        stack: error.stack,
        location: 'puppeteer.js:evaluate'
      });
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
        throw new Error('没有可用的页面');
      }
      
      const defaultOptions = {
        fullPage: true
      };
      
      const screenshot = await this.page.screenshot({ ...defaultOptions, ...options });
      logger.info('截图已保存');
      return screenshot;
    } catch (error) {
      logger.error(`截图时出错: ${error.message}`, {
        stack: error.stack,
        location: 'puppeteer.js:takeScreenshot'
      });
      throw error;
    }
  }

  /**
   * 关闭浏览器
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.disconnect();
        logger.info('已断开与浏览器的连接');
      }
      
      // 清理临时文件
      cleanupTempFiles();
    } catch (error) {
      logger.error(`关闭浏览器时出错: ${error.message}`, {
        stack: error.stack,
        location: 'puppeteer.js:close'
      });
      throw error;
    }
  }
}

export default new PuppeteerController();
