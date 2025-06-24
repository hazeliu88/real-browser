import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import { BITBROWSER_CONFIG, LOGGER_CONFIG } from '../config/config.js';

// 配置日志
const logger = createLogger({
  level: LOGGER_CONFIG.level,
  format: format.combine(
    format.timestamp(LOGGER_CONFIG.format.timestamp),
    format.printf(LOGGER_CONFIG.format.printf)
  ),
  transports: [new transports.Console()]
});

/**
 * 创建比特浏览器
 * @param {Object} options - 浏览器配置选项
 * @param {string} [options.name='puppeteer'] - 浏览器名称，默认为'puppeteer'
 * @param {string} [options.remark=''] - 备注
 * @param {number} [options.proxyMethod=2] - 代理方式 2自定义 3提取IP
 * @param {string} [options.proxyType='noproxy'] - 代理类型 ['noproxy', 'http', 'https', 'socks5', 'ssh']
 * @param {string} [options.host=''] - 代理主机
 * @param {string} [options.port=''] - 代理端口
 * @param {string} [options.proxyUserName=''] - 代理账号
 * @param {Object} [options.browserFingerPrint] - 指纹对象
 * @param {string} [options.browserFingerPrint.coreVersion='124'] - 内核版本
 * @returns {Promise<string>} - 浏览器ID
 */
async function createBrowser(options = {}) {
  try {
    // 设置默认名称为'puppeteer'，同时允许通过参数覆盖
    const browserName = options.name || 'puppeteer';
    
    const jsonData = {
      name: browserName,
      remark: options.remark || '',
      proxyMethod: options.proxyMethod || 2,
      proxyType: options.proxyType || 'noproxy',
      host: options.host || '',
      port: options.port || '',
      proxyUserName: options.proxyUserName || '',
      browserFingerPrint: options.browserFingerPrint || { coreVersion: '124' }
    };

    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/update`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    const res = response.data;
    logger.info(`createBrowser: ${JSON.stringify(res)}`);
    
    if (!res.success) {
      throw new Error(`Failed to create browser: ${res.message}`);
    }
    
    const browserId = res.data.id;
    logger.info(`Browser created with ID: ${browserId}`);
    return browserId;
  } catch (error) {
    logger.error(`Error in createBrowser: ${error.message}`);
    throw error;
  }
}

/**
 * 打开比特浏览器
 * @param {string} browserId - 浏览器ID
 * @returns {Promise<Object>} - 打开浏览器的响应数据
 */
async function openBrowser(browserId) {
  try {
    const jsonData = { id: browserId };
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/open`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    const res = response.data;
    logger.info(`openBrowser: ${JSON.stringify(res)}`);
    
    if (!res.success) {
      throw new Error(`Failed to open browser: ${res.message}`);
    }
    
    return res;
  } catch (error) {
    logger.error(`Error in openBrowser: ${error.message}`);
    throw error;
  }
}

/**
 * 关闭比特浏览器
 * @param {string} browserId - 浏览器ID
 * @returns {Promise<Object>} - 关闭浏览器的响应数据
 */
async function closeBrowser(browserId) {
  try {
    const jsonData = { id: browserId };
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/close`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    const res = response.data;
    logger.info(`closeBrowser: ${JSON.stringify(res)}`);
    
    if (!res.success) {
      throw new Error(`Failed to close browser: ${res.message}`);
    }
    
    return res;
  } catch (error) {
    logger.error(`Error in closeBrowser: ${error.message}`);
    throw error;
  }
}

/**
 * 删除比特浏览器
 * @param {string} browserId - 浏览器ID
 * @returns {Promise<Object>} - 删除浏览器的响应数据
 */
async function deleteBrowser(browserId) {
  try {
    const jsonData = { id: browserId };
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/delete`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    const res = response.data;
    logger.info(`deleteBrowser: ${JSON.stringify(res)}`);
    
    if (!res.success) {
      throw new Error(`Failed to delete browser: ${res.message}`);
    }
    
    return res;
  } catch (error) {
    logger.error(`Error in deleteBrowser: ${error.message}`);
    throw error;
  }
}

/**
 * 更新比特浏览器
 * @param {Object} options - 更新选项
 * @param {Array<string>} options.ids - 要更新的浏览器ID数组
 * @param {string} [options.remark] - 新的备注
 * @param {Object} [options.browserFingerPrint] - 新的指纹对象
 * @returns {Promise<Object>} - 更新结果
 */
async function updateBrowser(options) {
  try {
    if (!options.ids || options.ids.length === 0) {
      throw new Error('Browser IDs are required for update');
    }
    
    const jsonData = {
      ids: options.ids,
      remark: options.remark,
      browserFingerPrint: options.browserFingerPrint
    };
    
    // 过滤掉未定义的属性
    Object.keys(jsonData).forEach(key => {
      if (jsonData[key] === undefined) {
        delete jsonData[key];
      }
    });

    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/update/partial`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    const res = response.data;
    logger.info(`updateBrowser: ${JSON.stringify(res)}`);
    
    if (!res.success) {
      throw new Error(`Failed to update browser: ${res.message}`);
    }
    
    return res;
  } catch (error) {
    logger.error(`Error in updateBrowser: ${error.message}`);
    throw error;
  }
}

/**
 * 获取比特浏览器调试信息
 * @param {string} browserId - 浏览器ID
 * @returns {Promise<Object>} - 调试信息
 */
async function getBrowserDebugInfo(browserId) {
  try {
    const res = await openBrowser(browserId);
    
    if (!res.success) {
      logger.error(`Failed to open browser: ${browserId}`);
      return null;
    }
    
    return {
      driverPath: res.data.driver,
      debuggerAddress: res.data.http
    };
  } catch (error) {
    logger.error(`Error getting browser debug info: ${error.message}`);
    throw error;
  }
}

export {
  createBrowser,
  openBrowser,
  closeBrowser,
  deleteBrowser,
  updateBrowser,
  getBrowserDebugInfo
};
