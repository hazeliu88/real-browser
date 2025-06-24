import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import { BITBROWSER_CONFIG, LOGGER_CONFIG, TEMP_FILES_CONFIG } from '../config/config.js';
import fse from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 临时文件目录
const TEMP_DIR = join(__dirname, '../temp');

// 确保临时目录存在
fse.ensureDirSync(TEMP_DIR);

// 配置带颜色的日志
const logger = createLogger({
  level: LOGGER_CONFIG.level,
  format: format.combine(
    format.timestamp(LOGGER_CONFIG.format.timestamp),
    format.printf(LOGGER_CONFIG.format.printf)
  ),
  transports: [new transports.Console()]
});

/**
 * 验证API响应是否成功
 * @param {Object} response - API响应
 * @param {string} operation - 操作名称，用于日志
 * @returns {Object} - 响应数据
 * @throws {Error} - 如果响应不成功或格式不正确
 */
function validateResponse(response, operation) {
  if (!response || !response.data) {
    throw new Error(`Invalid response format from ${operation} API`);
  }
  
  if (!response.data.success) {
    throw new Error(`API request failed: ${response.data.message || 'Unknown error'}`);
  }
  
  return response.data;
}

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

    logger.debug(`Sending create browser request: ${JSON.stringify(jsonData)}`);
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/update`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    // 验证响应
    const res = validateResponse(response, 'create browser');
    
    logger.info(`Browser created successfully: ${JSON.stringify(res)}`);
    
    const browserId = res.data.id;
    logger.info(`Browser ID: ${browserId}`);
    return browserId;
  } catch (error) {
    logger.error(`Error in createBrowser: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:createBrowser'
    });
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
    
    logger.debug(`Sending open browser request: ${JSON.stringify(jsonData)}`);
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/open`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    // 验证响应
    const res = validateResponse(response, 'open browser');
    
    logger.info(`Browser opened successfully: ${JSON.stringify(res)}`);
    
    return res;
  } catch (error) {
    logger.error(`Error in openBrowser: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:openBrowser'
    });
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
    
    logger.debug(`Sending close browser request: ${JSON.stringify(jsonData)}`);
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/close`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    // 验证响应
    const res = validateResponse(response, 'close browser');
    
    logger.info(`Browser closed successfully: ${JSON.stringify(res)}`);
    
    return res;
  } catch (error) {
    logger.error(`Error in closeBrowser: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:closeBrowser'
    });
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
    
    logger.debug(`Sending delete browser request: ${JSON.stringify(jsonData)}`);
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/delete`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    // 验证响应
    const res = validateResponse(response, 'delete browser');
    
    logger.info(`Browser deleted successfully: ${JSON.stringify(res)}`);
    
    return res;
  } catch (error) {
    logger.error(`Error in deleteBrowser: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:deleteBrowser'
    });
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

    logger.debug(`Sending update browser request: ${JSON.stringify(jsonData)}`);
    
    const response = await axios.post(
      `${BITBROWSER_CONFIG.url}/browser/update/partial`,
      JSON.stringify(jsonData),
      { headers: BITBROWSER_CONFIG.headers }
    );

    // 验证响应
    const res = validateResponse(response, 'update browser');
    
    logger.info(`Browser updated successfully: ${JSON.stringify(res)}`);
    
    return res;
  } catch (error) {
    logger.error(`Error in updateBrowser: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:updateBrowser'
    });
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
    
    // 验证响应数据
    if (!res || !res.data) {
      throw new Error('Invalid response data from open browser API');
    }
    
    // 检查必要的字段是否存在
    if (!res.data.http) {
      throw new Error('Browser debug information is incomplete (missing http endpoint)');
    }
    
    // 确保WebSocket URL格式正确（添加ws://前缀）
    let debuggerAddress = res.data.http;
    if (!debuggerAddress.startsWith('ws://') && !debuggerAddress.startsWith('wss://')) {
      debuggerAddress = `ws://${debuggerAddress}`;
      logger.info(`Added 'ws://' prefix to debugger address: ${debuggerAddress}`);
    }
    
    // 尝试通过HTTP端点获取WebSocket调试URL
    try {
      const wsDebugUrlResponse = await axios.get(`http://${res.data.http}/json/version`);
      const wsDebugUrl = wsDebugUrlResponse.data.webSocketDebuggerUrl;
      
      if (wsDebugUrl) {
        debuggerAddress = wsDebugUrl;
        logger.info(`Successfully retrieved WebSocket debugger URL: ${debuggerAddress}`);
      } else {
        logger.warn('Failed to retrieve WebSocket debugger URL, using default endpoint');
      }
    } catch (httpError) {
      logger.warn(`Error fetching WebSocket debugger URL: ${httpError.message}`);
      logger.warn('Using default WebSocket endpoint');
    }
    
    const debugInfo = {
      driverPath: res.data.driver || '',
      debuggerAddress,
      chromePort: debuggerAddress.split(':')[2] // 提取端口号
    };
    
    // 保存调试信息到临时文件
    const debugInfoPath = join(__dirname, '../', TEMP_FILES_CONFIG.wsEndpointFilePath);
    fse.writeJSONSync(debugInfoPath, debugInfo);
    
    logger.info(`Browser debug info saved to: ${debugInfoPath}`);
    return debugInfo;
  } catch (error) {
    logger.error(`Error in getBrowserDebugInfo: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:getBrowserDebugInfo'
    });
    throw error;
  }
}

/**
 * 生成用于 puppeteer-real-browser 的配置
 * @param {string} browserId - 浏览器ID
 * @returns {Promise<Object>} - puppeteer-real-browser 配置
 */
async function generatePuppeteerRealBrowserConfig(browserId) {
  try {
    const debugInfo = await getBrowserDebugInfo(browserId);
    
    // 验证调试信息
    if (!debugInfo || !debugInfo.debuggerAddress) {
      throw new Error('Failed to get valid browser debug info');
    }
    
    // 确保WebSocket URL格式正确
    let wsEndpoint = debugInfo.debuggerAddress;
    if (!wsEndpoint.startsWith('ws://') && !wsEndpoint.startsWith('wss://')) {
      wsEndpoint = `ws://${wsEndpoint}`;
      logger.info(`Added 'ws://' prefix to WebSocket endpoint: ${wsEndpoint}`);
    }
    
    // 创建配置对象
    const config = {
      browserWSEndpoint: wsEndpoint,
      browserURL: undefined, // 明确设置为undefined，确保只使用browserWSEndpoint
      chromePort: debugInfo.chromePort,
      executablePath: debugInfo.driverPath
    };
    
    // 保存配置到临时文件
    const configPath = join(__dirname, '../', TEMP_FILES_CONFIG.configFilePath);
    fse.writeJSONSync(configPath, config);
    
    logger.info(`Puppeteer-real-browser config saved to: ${configPath}`);
    return config;
  } catch (error) {
    logger.error(`Error in generatePuppeteerRealBrowserConfig: ${error.message}`, {
      stack: error.stack,
      location: 'bitbrowser.js:generatePuppeteerRealBrowserConfig'
    });
    throw error;
  }
}

export {
  createBrowser,
  openBrowser,
  closeBrowser,
  deleteBrowser,
  updateBrowser,
  getBrowserDebugInfo,
  generatePuppeteerRealBrowserConfig
};
