import chalk from 'chalk';

// 比特浏览器API配置
export const BITBROWSER_CONFIG = {
  url: "http://127.0.0.1:54345",
  headers: {
    'Content-Type': 'application/json'
  }
};

// 日志配置
export const LOGGER_CONFIG = {
  level: 'info',
  format: {
    timestamp: { format: 'YYYY-MM-DD HH:mm:ss' },
    printf: (info) => {
      let message = `${info.timestamp} `;
      
      switch (info.level) {
        case 'error':
          message += chalk.red(`[${info.level.toUpperCase()}]`) + ' ' + chalk.red(info.message);
          break;
        case 'warn':
          message += chalk.yellow(`[${info.level.toUpperCase()}]`) + ' ' + chalk.yellow(info.message);
          break;
        case 'info':
          message += chalk.blue(`[${info.level.toUpperCase()}]`) + ' ' + info.message;
          break;
        case 'debug':
          message += chalk.green(`[${info.level.toUpperCase()}]`) + ' ' + info.message;
          break;
        default:
          message += `[${info.level.toUpperCase()}]` + ' ' + info.message;
      }
      
      return message;
    }
  }
};

// Puppeteer-real-browser配置
export const PUPPETEER_REAL_BROWSER_CONFIG = {
  headless: false,
  args: ['--start-maximized'],
  turnstile: true,
  customConfig: {},
  connectOption: {
    defaultViewport: null
  }
};

// 临时文件配置
export const TEMP_FILES_CONFIG = {
  configFilePath: './temp/config.json',
  wsEndpointFilePath: './temp/wsEndpoint.json',
  cleanupInterval: 60000 // 1分钟清理一次临时文件
};
