# @zhiaiwan/debug SDK 使用文档

## 概述

@zhiaiwan/debug SDK 是一个功能强大的前端监控工具，提供了全面的性能监控、错误追踪和用户行为分析功能。通过简单的配置，您可以收集各种前端数据并发送到指定的服务器进行分析。

## 安装

```bash
npm install @zhiaiwan/debug
# 或
yarn add @zhiaiwan/debug
```

## 快速开始

```javascript
import ZhiAiWanDebug from "@zhiaiwan/debug";
// 初始化SDK
const tracker = new ZhiAiWanDebug({
  reportUrl: "https://your-api-endpoint.com/track",
  debug: true, // 开发模式下开启调试日志
});
// 手动跟踪自定义事件
tracker.trackEvent("button-click", { buttonId: "cta-button" });
// 手动捕获错误
try {
  // 可能出错的代码
} catch (error) {
  tracker.captureError(error, { context: "checkout-process" });
}
```

## 完整配置选项

| 配置项                   | 类型       | 默认值                            | 说明                       |
| ------------------------ | ---------- | --------------------------------- | -------------------------- |
| `reportUrl`              | `string`   | `"http://api.zhiaiwan.com/track"` | 数据上报地址               |
| `autoTrack`              | `boolean`  | `true`                            | 是否自动跟踪用户行为       |
| `captureErrors`          | `boolean`  | `true`                            | 是否捕获 JavaScript 错误   |
| `capturePerformance`     | `boolean`  | `true`                            | 是否收集性能数据           |
| `captureWebVitals`       | `boolean`  | `true`                            | 是否收集 Web Vitals 指标   |
| `captureNetworkErrors`   | `boolean`  | `true`                            | 是否捕获网络请求错误       |
| `captureWebSocketErrors` | `boolean`  | `true`                            | 是否捕获 WebSocket 错误    |
| `captureLongTasks`       | `boolean`  | `true`                            | 是否监控长任务             |
| `captureResourceTiming`  | `boolean`  | `true`                            | 是否监控资源加载           |
| `capturePageVisibility`  | `boolean`  | `true`                            | 是否监控页面可见性变化     |
| `captureUserClicks`      | `boolean`  | `true`                            | 是否监控用户点击           |
| `captureUserInputs`      | `boolean`  | `true`                            | 是否监控用户输入           |
| `capturePageStays`       | `boolean`  | `true`                            | 是否监控页面停留时间       |
| `captureRouterChanges`   | `boolean`  | `true`                            | 是否监控路由变化           |
| `capturePageViews`       | `boolean`  | `true`                            | 是否监控页面访问           |
| `requestTimeout`         | `number`   | `10000`                           | 请求超时时间(ms)           |
| `webSocketTimeout`       | `number`   | `30000`                           | WebSocket 连接超时时间(ms) |
| `sessionTimeout`         | `number`   | `1800000`                         | 会话超时时间(ms)           |
| `maxQueueSize`           | `number`   | `20`                              | 最大队列大小               |
| `reportInterval`         | `number`   | `10000`                           | 上报间隔(ms)               |
| `shouldTrackEvent`       | `function` | `() => true`                      | 事件过滤函数               |
| `transformEvent`         | `function` | `(event) => event`                | 事件转换函数               |
| `debug`                  | `boolean`  | `false`                           | 是否开启调试模式           |

## 核心功能

### 1. 性能监控

自动收集性能指标：

- 白屏时间
- DNS 查询时间
- TCP 连接时间
- 首字节到达时间(TTFB)
- DOM 加载完成时间
- 页面完全加载时间

```javascript
// 获取性能指标
const performanceData = tracker.getMetric("FCP");
console.log("首次内容渲染时间:", performanceData.value, performanceData.rating);
```

### 2. 错误监控

自动捕获：

- JavaScript 运行时错误
- Promise 拒绝错误
- 资源加载错误
- 网络请求错误
- WebSocket 错误
  手动捕获错误：

```javascript
try {
  // 业务代码
} catch (error) {
  tracker.captureError(error, {
    module: "checkout",
    userId: "12345",
  });
}
```

### 3. 用户行为分析

自动跟踪：

- 页面访问(PV)
- 用户点击
- 表单输入
- 页面停留时间
- 路由变化

```javascript
// 手动跟踪自定义事件
tracker.trackEvent("product-view", {
  productId: "p123",
  category: "electronics",
  price: 299.99,
});
```

### 4. Web Vitals 监控

自动收集核心 Web Vitals 指标：

- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TTFB (Time to First Byte)
- INP (Interaction to Next Paint)

```javascript
// 获取LCP指标
const lcpMetric = tracker.getMetric("LCP");
console.log("最大内容渲染时间:", lcpMetric.value, lcpMetric.rating);
```

## API 参考

### 构造函数

```typescript
new ZhiAiWanDebug(options?: TrackerConfig)
```

### 方法

| 方法           | 参数                                            | 返回值                              | 说明                   |
| -------------- | ----------------------------------------------- | ----------------------------------- | ---------------------- |
| `trackEvent`   | `eventName: string, data?: Record<string, any>` | `void`                              | 跟踪自定义事件         |
| `captureError` | `error: Error, context?: Record<string, any>`   | `void`                              | 手动捕获错误           |
| `flush`        | -                                               | `void`                              | 立即上报所有收集的数据 |
| `getMetric`    | `name: WebVitalType`                            | `{ value: number; rating: string }` | 获取 Web Vitals 指标值 |
| `getSessionId` | -                                               | `string`                            | 获取当前会话 ID        |
| `getUserId`    | -                                               | `string`                            | 获取用户 ID            |
| `setUserId`    | `newUserId: string`                             | `void`                              | 更新用户 ID            |
| `getStats`     | -                                               | `object`                            | 获取 SDK 统计信息      |

### 使用示例

```javascript
// 初始化SDK
const tracker = new ZhiAiWanDebug({
  reportUrl: "https://your-api.com/track",
  captureLongTasks: false, // 关闭长任务监控
  captureUserInputs: false, // 关闭用户输入监控
  debug: process.env.NODE_ENV === "development",
});
// 更新用户ID（登录后调用）
tracker.setUserId("user-12345");
// 获取当前会话信息
console.log("会话ID:", tracker.getSessionId());
console.log("用户ID:", tracker.getUserId());
// 获取性能指标
const ttfbMetric = tracker.getMetric("TTFB");
console.log("首字节时间:", ttfbMetric.value, ttfbMetric.rating);
// 手动触发事件
document.getElementById("cta-button").addEventListener("click", () => {
  tracker.trackEvent("cta-click", {
    buttonId: "main-cta",
    page: "homepage",
  });
});
// 页面卸载前手动上报
window.addEventListener("beforeunload", () => {
  tracker.flush();
});
```

## 数据上报格式

所有事件都包含以下基础字段：

```typescript
{
  type: string; // 事件类型
  data: any; // 事件数据
  sessionId: string; // 会话ID
  userId: string; // 用户ID
  userAgent: string; // 用户代理
  screen: string; // 屏幕分辨率
  language: string; // 用户语言
  timestamp: number; // 时间戳
}
```

### 事件类型示例

1. **页面访问 (pageview)**

```json
{
  "type": "pageview",
  "data": {
    "url": "https://example.com/products",
    "referrer": "https://google.com",
    "title": "Product Page"
  }
  // ...基础字段
}
```

2. **页面停留 (page-stay)**

```json
{
  "type": "page-stay",
  "data": {
    "url": "https://example.com/products",
    "duration": 4500
  }
  // ...基础字段
}
```

3. **JavaScript 错误 (js-error)**

```json
{
  "type": "js-error",
  "data": {
    "message": "Uncaught TypeError: Cannot read property...",
    "filename": "https://example.com/app.js",
    "lineno": 25,
    "colno": 12,
    "error": {
      "name": "TypeError",
      "message": "Cannot read property 'name' of undefined",
      "stack": "TypeError: Cannot read property 'name' of undefined..."
    }
  }
  // ...基础字段
}
```

## 最佳实践

1. **生产环境配置**

```javascript
const tracker = new ZhiAiWanDebug({
  reportUrl: "https://prod-api.example.com/track",
  debug: false,
  maxQueueSize: 50,
  reportInterval: 15000,
});
```

2. **用户身份跟踪**

```javascript
// 用户登录后
tracker.setUserId("user-12345");
// 用户登出后
tracker.setUserId("anonymous");
```

3. **自定义事件过滤**

```javascript
const tracker = new ZhiAiWanDebug({
  shouldTrackEvent: (event) => {
    // 忽略测试事件
    if (event.type === "test-event") return false;

    // 只收集特定页面的事件
    if (event.type === "user-action") {
      return window.location.href.includes("/products");
    }

    return true;
  },
});
```

4. **事件数据增强**

```javascript
const tracker = new ZhiAiWanDebug({
  transformEvent: (event) => {
    // 添加设备信息
    event.data.device = {
      type: /Mobile/.test(navigator.userAgent) ? "mobile" : "desktop",
      os: navigator.platform,
    };

    // 添加业务上下文
    event.data.context = {
      version: "1.2.3",
      environment: "production",
    };

    return event;
  },
});
```

## 注意事项

1. **数据隐私**
   - 确保遵守 GDPR 和其他隐私法规
   - 避免收集敏感用户信息
   - 提供用户选择退出机制
2. **性能影响**
   - 在生产环境中关闭调试模式
   - 根据需求关闭不需要的监控项
   - 监控 SDK 自身性能影响
3. **错误处理**
   - SDK 内部会捕获自身错误，不会影响应用运行
   - 在调试模式下可查看 SDK 内部错误日志
4. **浏览器兼容性**
   - 支持现代浏览器（Chrome, Firefox, Safari, Edge）
   - 不支持 IE11 及以下版本
     通过合理配置和使用 ZhiAiWanDebug SDK，您可以全面了解应用性能、用户行为和错误情况，从而持续优化用户体验。
