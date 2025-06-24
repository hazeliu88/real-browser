import { createBrowser, closeBrowser, deleteBrowser } from './browser/bitbrowser.js';
import puppeteerController from './browser/puppeteer.js';
import { createLogger, format, transports } from 'winston';
import { LOGGER_CONFIG } from './config/config.js';

// 配置日志
const logger = createLogger({
  level: LOGGER_CONFIG.level,
  format: format.combine(
    format.timestamp(LOGGER_CONFIG.format.timestamp),
    format.printf(LOGGER_CONFIG.format.printf)
  ),
  transports: [new transports.Console()]
});

async function main() {
  try {
    // 1. 创建比特浏览器
    logger.info('Creating BitBrowser...');
    const browserId = await createBrowser({
      // 不指定名称，将使用默认值 'puppeteer'
      remark: 'Integration with Puppeteer-Real-Browser',
      browserFingerPrint: {
        coreVersion: '124'
      }
    });
    
    // 2. 连接Puppeteer到比特浏览器
    logger.info('Connecting Puppeteer to BitBrowser...');
    await puppeteerController.connectToBitBrowser(browserId, {
      headless: false, // 以有头模式运行，便于观察
      turnstile: true, // 处理Cloudflare Turnstile验证码
      args: ['--start-maximized'] // 最大化窗口
    });
    
    // 3. 导航到示例网站
    logger.info('Navigating to example website...');
    await puppeteerController.navigateTo('https://www.google.com');
    
    // 4. 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. 执行一些操作
    logger.info('Performing actions on the page...');
    await puppeteerController.evaluate(() => {
      // 在Google搜索框中输入文本
      const searchBox = document.querySelector('input[name="q"]');
      if (searchBox) {
        searchBox.value = 'Puppeteer Real Browser Integration';
      }
    });
    
    // 6. 截图
    logger.info('Taking screenshot...');
    await puppeteerController.takeScreenshot({ path: 'screenshot.png' });
    
    // 7. 等待一段时间后关闭
    logger.info('Waiting for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 8. 关闭Puppeteer
    logger.info('Closing Puppeteer...');
    await puppeteerController.close();
    
    // 9. 关闭比特浏览器
    logger.info('Closing BitBrowser...');
    await closeBrowser(browserId);
    
    // 10. 等待一段时间后删除
    logger.info('Waiting for 5 seconds before deleting...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 11. 删除比特浏览器
    logger.info('Deleting BitBrowser...');
    await deleteBrowser(browserId);
    
    logger.info('All operations completed successfully!');
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main();
