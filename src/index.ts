import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from "web-vitals";
/**
 * SDK配置选项
 */
export type TrackerConfig = {
  reportUrl?: string;
  autoTrack?: boolean;
  captureErrors?: boolean;
  capturePerformance?: boolean;
  captureWebVitals?: boolean;
  captureNetworkErrors?: boolean;
  captureWebSocketErrors?: boolean;
  captureLongTasks?: boolean; // 监控长任务
  captureResourceTiming?: boolean; // 监控资源加载
  capturePageVisibility?: boolean; // 监控页面可见性变化
  captureUserClicks?: boolean; // 监控用户点击
  captureUserInputs?: boolean; // 监控用户输入
  capturePageStays?: boolean; // 监控页面停留时间
  captureRouterChanges?: boolean; // 监控路由变化
  capturePageViews?: boolean; // 监控页面访问
  requestTimeout?: number;
  webSocketTimeout?: number;
  sessionTimeout?: number;
  maxQueueSize?: number;
  reportInterval?: number;
  shouldTrackEvent?: (event: CollectableEvent) => boolean;
  transformEvent?: (event: EventData) => EventData;
  debug?: boolean;
};

/**
 * Web Vitals指标类型
 */
export type WebVitalType = "CLS" | "FCP" | "LCP" | "TTFB" | "INP";

/**
 * Web Vitals指标数据
 */
export type WebVitalMetric = {
  name: WebVitalType;
  value: number;
  delta: number;
  id: string;
  rating?: "good" | "needs-improvement" | "poor";
};

/**
 * 错误数据结构
 */
export type ErrorData = {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: number;
  userAction?: UserAction[];
};

/**
 * 用户行为数据
 */
export type UserAction = {
  type: string;
  element?: string;
  text?: string;
  value?: string;
  time: number;
};

/**
 * 性能数据
 */
export type PerformanceData = {
  dns: number;
  tcp: number;
  ttfb: number;
  download: number;
  domReady: number;
  onload: number;
  whiteScreen: number;
};

/**
 * 网络请求错误数据
 */
export type NetworkErrorData = {
  url: string;
  method: string;
  status: number;
  statusText: string;
  response?: string;
  duration: number;
  timestamp: number;
  userAction?: UserAction[];
  timeout?: boolean;
};

/**
 * WebSocket错误数据
 */
export type WebSocketErrorData = {
  url: string;
  readyState: number;
  timestamp: number;
  error?: string;
  timeout?: boolean;
};

/**
 * 事件数据结构
 */
export type EventData = {
  type: string;
  data: Record<string, any>;
  sessionId: string;
  userId: string;
  userAgent: string;
  screen: string;
  language: string;
  timestamp: number;
};

/**
 * 收集事件时使用的类型（不包含自动添加的公共字段）
 */
type CollectableEvent = Omit<
  EventData,
  "sessionId" | "userAgent" | "screen" | "language" | "userId"
>;

/**
 * Web Vitals增强的前端监控SDK
 */
export default class ZhiAiWanDebug {
  version: string = '1.0.0-alpha.1';
  private config: Required<TrackerConfig>;
  private queue: EventData[] = [];
  private sessionId: string;
  private userId: string;
  private userActions: UserAction[] = [];
  private stats = {
    events: 0,
    errors: 0,
    performance: 0,
    networkErrors: 0,
    webSocketErrors: 0,
    sessionStart: Date.now(),
    lastReport: null as Date | null,
    pageStarts: new Map<string, number>(),
  };
  private metrics: Record<WebVitalType, { value: number; rating: string }> = {
    LCP: { value: 0, rating: "good" },
    CLS: { value: 0, rating: "good" },
    FCP: { value: 0, rating: "good" },
    INP: { value: 0, rating: "good" },
    TTFB: { value: 0, rating: "good" },
  };

  // 保存原始API引用
  private originalXHR: {
    open: typeof XMLHttpRequest.prototype.open;
    send: typeof XMLHttpRequest.prototype.send;
  } | null = null;

  private originalFetch: typeof window.fetch | null = null;
  private originalWebSocket: typeof WebSocket | null = null;

  constructor(options: TrackerConfig = {}) {
    // 合并默认配置（所有监听默认开启）
    this.config = {
      reportUrl: options.reportUrl || "http://api.zhiaiwan.com/track",
      autoTrack: options.autoTrack !== false,
      captureErrors: options.captureErrors !== false,
      capturePerformance: options.capturePerformance !== false,
      captureWebVitals: options.captureWebVitals !== false,
      captureNetworkErrors: options.captureNetworkErrors !== false,
      captureWebSocketErrors: options.captureWebSocketErrors !== false,
      captureLongTasks: options.captureLongTasks !== false,
      captureResourceTiming: options.captureResourceTiming !== false,
      capturePageVisibility: options.capturePageVisibility !== false,
      captureUserClicks: options.captureUserClicks !== false,
      captureUserInputs: options.captureUserInputs !== false,
      capturePageStays: options.capturePageStays !== false,
      captureRouterChanges: options.captureRouterChanges !== false,
      capturePageViews: options.capturePageViews !== false,
      requestTimeout: options.requestTimeout || 10000,
      webSocketTimeout: options.webSocketTimeout || 30000,
      sessionTimeout: options.sessionTimeout || 30 * 60 * 1000,
      maxQueueSize: options.maxQueueSize || 20,
      reportInterval: options.reportInterval || 10000,
      shouldTrackEvent: options.shouldTrackEvent || (() => true),
      transformEvent: options.transformEvent || ((event) => event),
      debug: options.debug || false,
      ...options,
    } as Required<TrackerConfig>;

    this.sessionId = this.generateUUID();
    this.userId = this.getOrCreateUserId();
    this.init();
  }

  private init(): void {
    // 初始化会话跟踪
    this.initSession();

    // 初始化性能监控
    if (this.config.capturePerformance) {
      this.initPerformance();
    }

    // 初始化Web Vitals监控
    if (this.config.captureWebVitals) {
      this.initWebVitals();
    }

    // 初始化错误监控
    if (this.config.captureErrors) {
      this.initErrorTracking();
    }

    // 初始化网络错误监控
    if (this.config.captureNetworkErrors) {
      this.initNetworkErrorTracking();
    }

    // 初始化WebSocket错误监控
    if (this.config.captureWebSocketErrors) {
      this.initWebSocketErrorTracking();
    }

    // 初始化用户行为追踪
    if (this.config.autoTrack) {
      this.initAutoTracking();
    }

    // 初始化上报定时器
    this.initReporter();

    // 页面卸载前上报数据
    window.addEventListener("beforeunload", () => {
      if (this.config.capturePageStays) {
        this.trackPageStay();
      }
      this.flush();
    });

    // 开发模式日志
    if (this.config.debug) {
      console.log("[ZhiAiWanDebug] SDK initialized with config:", this.config);
      console.log(`[ZhiAiWanDebug] User ID: ${this.userId}`);
    }
  }

  private getOrCreateUserId(): string {
    const STORAGE_KEY = "zaw_user_id";
    try {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) return storedId;
      const newId = this.generateUUID();
      localStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch (e) {
      return `temp_${this.sessionId}`;
    }
  }

  private initSession(): void {
    setInterval(() => {
      const sessionTime = Math.floor(
        (Date.now() - this.stats.sessionStart) / 1000
      );
    }, 1000);
  }

  private initWebVitals(): void {
    try {
      onLCP(
        (metric) => this.handleWebVitalMetric("LCP", metric),
        { reportAllChanges: true }
      );

      onCLS(
        (metric) => this.handleWebVitalMetric("CLS", metric),
        { reportAllChanges: true }
      );

      onFCP((metric) => this.handleWebVitalMetric("FCP", metric));
      onTTFB((metric) => this.handleWebVitalMetric("TTFB", metric));
      onINP((metric) => this.handleWebVitalMetric("INP", metric));
    } catch (e) {
      this.log("Web Vitals加载失败: " + (e as Error).message, "error");
    }
  }

  private handleWebVitalMetric(name: WebVitalType, metric: Metric): void {
    const metricData: CollectableEvent = {
      type: "web-vital",
      data: {
        name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
      timestamp: Date.now(),
    };

    this.collect(metricData);
    this.stats.performance++;

    this.metrics[name] = {
      value: metric.value,
      rating: metric.rating || "good",
    };

    if (this.config.debug) {
      console.log(
        `[ZhiAiWanDebug] Captured ${name}: ${metric.value} (${metric.rating})`
      );
    }
  }

  private initPerformance(): void {
    window.addEventListener("load", () => {
      if (window.performance?.timing) {
        const timing = window.performance.timing;
        const perfData: PerformanceData = {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          ttfb: timing.responseStart - timing.requestStart,
          download: timing.responseEnd - timing.responseStart,
          domReady: timing.domContentLoadedEventEnd - timing.fetchStart,
          onload: timing.loadEventEnd - timing.fetchStart,
          whiteScreen: timing.responseStart - timing.navigationStart,
        };

        this.collect({
          type: "performance",
          data: perfData,
          timestamp: Date.now(),
        });

        this.stats.performance++;
      }
    });

    if (window.PerformanceObserver) {
      // 监控长任务（根据配置）
      if (this.config.captureLongTasks) {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              this.collect({
                type: "longtask",
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                },
                timestamp: Date.now(),
              });
            }
          });
        });
        longTaskObserver.observe({ type: "longtask", buffered: true });
      }

      // 监控资源加载（根据配置）
      if (this.config.captureResourceTiming) {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.collect({
              type: "resource",
              data: {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                initiatorType: resourceEntry.initiatorType,
                transferSize: resourceEntry.transferSize,
                decodedBodySize: resourceEntry.decodedBodySize,
                encodedBodySize: resourceEntry.encodedBodySize,
              },
              timestamp: Date.now(),
            });
          });
        });
        resourceObserver.observe({ type: "resource", buffered: true });
      }
    }
  }

  private initErrorTracking(): void {
    // 捕获JS运行时错误
    window.addEventListener("error", (event) => {
      const errorData: ErrorData = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? this.serializeError(event.error) : undefined,
        timestamp: Date.now(),
        userAction: this.getRecentUserActions(),
      };

      this.collectError("js-error", errorData);
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const errorData: ErrorData = {
        message: reason.message || String(reason),
        error: this.serializeError(reason),
        timestamp: Date.now(),
      };

      this.collectError("promise-error", errorData);
    });

    // 捕获资源加载错误
    window.addEventListener(
      "error",
      (event) => {
        const target = event.target as Element;
        if (!target || !["IMG", "SCRIPT", "LINK"].includes(target.tagName))
          return;

        const errorData: ErrorData = {
          message: `Resource load failed: ${target.tagName}`,
          timestamp: Date.now(),
          error: {
            name: "ResourceError",
            message: `Failed to load resource: ${
              (target as HTMLImageElement).src ||
              (target as HTMLLinkElement).href
            }`,
          },
        };

        this.collectError("resource-error", errorData);
      },
      true
    );
  }

  private initNetworkErrorTracking(): void {
    const self = this;
    const originalXHR = window.XMLHttpRequest;

    window.XMLHttpRequest = function () {
      const xhr = new originalXHR();

      const requestData = {
        url: "",
        method: "",
        startTime: 0,
        timeoutTimer: null as ReturnType<typeof setTimeout> | null,
        hasReportedTimeout: false,
      };

      const originalOpen = xhr.open;
      xhr.open = function (method: string, url: string | URL) {
        requestData.method = method;
        requestData.url = typeof url === "string" ? url : url.href;
        originalOpen.apply(xhr, arguments as any);
      };

      const originalSend = xhr.send;
      xhr.send = function (body) {
        requestData.startTime = Date.now();
        requestData.hasReportedTimeout = false;

        if (self.config.requestTimeout > 0) {
          requestData.timeoutTimer = setTimeout(() => {
            if (!requestData.hasReportedTimeout && xhr.readyState !== 4) {
              requestData.hasReportedTimeout = true;
              const duration = Date.now() - requestData.startTime;

              self.collectNetworkError({
                type: "xhr-timeout",
                url: requestData.url,
                method: requestData.method,
                status: 0,
                statusText: "Timeout",
                response: `Request timed out after ${self.config.requestTimeout}ms`,
                duration,
                timeout: true,
              });
            }
          }, self.config.requestTimeout);
        }

        xhr.addEventListener("loadend", function () {
          if (requestData.timeoutTimer) {
            clearTimeout(requestData.timeoutTimer);
            requestData.timeoutTimer = null;
          }

          if (requestData.hasReportedTimeout) return;

          if (xhr.status === 0 || (xhr.status >= 400 && xhr.status < 600)) {
            const duration = Date.now() - requestData.startTime;

            self.collectNetworkError({
              type: "xhr-error",
              url: requestData.url,
              method: requestData.method,
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText?.slice(0, 1000) || "",
              duration,
            });
          }
        });

        originalSend.apply(xhr, arguments as any);
      };

      return xhr;
    } as any;

    this.originalXHR = {
      open: originalXHR.prototype.open,
      send: originalXHR.prototype.send,
    };

    this.originalFetch = window.fetch;
    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ) {
      const startTime = Date.now();
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else {
        url = input.url;
      }

      const method = init?.method || "GET";
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      let hasReportedTimeout = false;

      if (self.config.requestTimeout > 0) {
        timeoutTimer = setTimeout(() => {
          hasReportedTimeout = true;
          const duration = Date.now() - startTime;

          self.collectNetworkError({
            type: "fetch-timeout",
            url,
            method,
            status: 0,
            statusText: "Timeout",
            response: `Request timed out after ${self.config.requestTimeout}ms`,
            duration,
            timeout: true,
          });
        }, self.config.requestTimeout);
      }

      try {
        const response = await self.originalFetch!.call(window, input, init);

        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }

        if (hasReportedTimeout) return response;

        if (!response.ok) {
          const duration = Date.now() - startTime;
          const responseClone = response.clone();
          let responseText = "";
          try {
            responseText = await responseClone.text();
          } catch (e) {
            responseText = "[Unable to read response]";
          }

          self.collectNetworkError({
            type: "fetch-error",
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            response: responseText?.slice(0, 1000) || "",
            duration,
          });
        }

        return response;
      } catch (error) {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }

        if (hasReportedTimeout) throw error;

        const duration = Date.now() - startTime;
        self.collectNetworkError({
          type: "fetch-error",
          url,
          method,
          status: 0,
          statusText: "Network Error",
          response: error instanceof Error ? error.message : String(error),
          duration,
        });

        throw error;
      }
    };
  }

  private collectNetworkError(
    errorData: Omit<NetworkErrorData, "timestamp" | "userAction"> & {
      type: string;
    }
  ) {
    const fullData: NetworkErrorData = {
      ...errorData,
      timestamp: Date.now(),
      userAction: this.getRecentUserActions(),
    };

    this.collect({
      type: errorData.type,
      data: fullData,
      timestamp: Date.now(),
    });

    this.stats.networkErrors++;

    if (this.config.debug) {
      const { type, url, method, status } = errorData;
      console.error(`[ZhiAiWanDebug] ${type}: ${method} ${url} - ${status}`);
    }
  }

  private initWebSocketErrorTracking(): void {
    const self = this;
    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = function (
      url: string | URL,
      protocols?: string | string[]
    ) {
      const urlString = typeof url === "string" ? url : url.href;
      const ws = protocols
        ? new OriginalWebSocket(url, protocols)
        : new OriginalWebSocket(url);

      const socketData = {
        url: urlString,
        connectTimer: null as ReturnType<typeof setTimeout> | null,
        hasConnected: false,
        hasReportedTimeout: false,
      };

      if (self.config.webSocketTimeout > 0) {
        socketData.connectTimer = setTimeout(() => {
          if (
            !socketData.hasConnected &&
            ws.readyState === WebSocket.CONNECTING
          ) {
            socketData.hasReportedTimeout = true;

            self.collect({
              type: "websocket-timeout",
              data: {
                url: socketData.url,
                readyState: ws.readyState,
                error: `Connection timed out after ${self.config.webSocketTimeout}ms`,
                timeout: true,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            });

            self.stats.webSocketErrors++;

            if (self.config.debug) {
              console.error(
                "[ZhiAiWanDebug] WebSocket Connection Timeout:",
                socketData.url
              );
            }
          }
        }, self.config.webSocketTimeout);
      }

      ws.addEventListener("open", () => {
        socketData.hasConnected = true;
        if (socketData.connectTimer) {
          clearTimeout(socketData.connectTimer);
          socketData.connectTimer = null;
        }
      });

      ws.addEventListener("error", (event) => {
        if (socketData.connectTimer) {
          clearTimeout(socketData.connectTimer);
          socketData.connectTimer = null;
        }

        if (socketData.hasReportedTimeout) return;

        const errorData: WebSocketErrorData = {
          url: socketData.url,
          readyState: ws.readyState,
          timestamp: Date.now(),
          error:
            event instanceof ErrorEvent ? event.message : "WebSocket error",
        };

        self.collect({
          type: "websocket-error",
          data: errorData,
          timestamp: Date.now(),
        });

        self.stats.webSocketErrors++;

        if (self.config.debug) {
          console.error("[ZhiAiWanDebug] WebSocket Error:", errorData);
        }
      });

      ws.addEventListener("close", () => {
        if (socketData.connectTimer) {
          clearTimeout(socketData.connectTimer);
          socketData.connectTimer = null;
        }
      });

      return ws;
    } as any;

    this.originalWebSocket = OriginalWebSocket;
  }

  private collectError(type: string, errorData: ErrorData): void {
    this.collect({
      type,
      data: errorData,
      timestamp: Date.now(),
    });

    this.stats.errors++;

    if (this.config.debug) {
      console.error(`[ZhiAiWanDebug] ${type}: ${errorData.message}`);
    }
  }

  private initAutoTracking(): void {
    // 监控用户点击（根据配置）
    if (this.config.captureUserClicks) {
      document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        if (!target) return;

        const clickData: UserAction = {
          type: "click",
          element: this.getElementPath(target),
          text: target.textContent?.trim().slice(0, 50) || "",
          time: Date.now() - this.stats.sessionStart,
        };

        this.collectUserAction(clickData);
      });
    }

    // 监控用户输入（根据配置）
    if (this.config.captureUserInputs) {
      document.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement;
        if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
          return;

        const inputData: UserAction = {
          type: "input",
          element: this.getElementPath(target),
          value: target.value.slice(0, 100),
          time: Date.now() - this.stats.sessionStart,
        };

        this.collectUserAction(inputData);
      });
    }

    // 监控页面可见性变化（根据配置）
    if (this.config.capturePageVisibility) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && this.config.capturePageStays) {
          this.trackPageStay();
        } else if (document.visibilityState === "visible") {
          this.stats.pageStarts.set(
            window.location.href,
            Date.now()
          );
        }
        
        if (this.config.capturePageVisibility) {
          this.collect({
            type: "visibility",
            data: {
              state: document.visibilityState,
            },
            timestamp: Date.now(),
          });
        }
      });
    }

    // 监控路由变化（根据配置）
    if (this.config.captureRouterChanges) {
      this.initRouterTracking();
    }
    
    // 监控页面访问（根据配置）
    if (this.config.capturePageViews) {
      this.trackPageView();
    }
  }

  private collectUserAction(action: UserAction): void {
    this.userActions.push(action);
    if (this.userActions.length > 20) {
      this.userActions.shift();
    }

    this.collect({
      type: "user-action",
      data: action,
      timestamp: Date.now(),
    });

    this.stats.events++;
  }

  private initRouterTracking(): void {
    // 监听hash变化
    window.addEventListener("hashchange", () => {
      if (this.config.capturePageStays) {
        this.trackPageStay();
      }
      if (this.config.capturePageViews) {
        this.trackPageView();
      }
    });

    // 监听history API变化
    const historyPushState = window.history.pushState;
    const historyReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      historyPushState.apply(window.history, args);
      if (this.config.capturePageStays) {
        this.trackPageStay();
      }
      if (this.config.capturePageViews) {
        this.trackPageView();
      }
    };

    window.history.replaceState = (...args) => {
      historyReplaceState.apply(window.history, args);
      if (this.config.capturePageStays) {
        this.stats.pageStarts.set(
          window.location.href,
          Date.now()
        );
      }
    };
  }

  private trackPageView(): void {
    const currentUrl = window.location.href;
    const now = Date.now();
    this.stats.pageStarts.set(currentUrl, now);
    
    if (this.config.capturePageViews) {
      this.collect({
        type: "pageview",
        data: {
          url: currentUrl,
          referrer: document.referrer,
          title: document.title,
          timestamp: now,
        },
        timestamp: now,
      });

      this.stats.events++;
      
      if (this.config.debug) {
        console.log(`[ZhiAiWanDebug] Pageview: ${currentUrl}`);
      }
    }
  }
  
  private trackPageStay(): void {
    if (!this.config.capturePageStays) return;
    
    const currentUrl = window.location.href;
    const pageStart = this.stats.pageStarts.get(currentUrl);
    
    if (pageStart) {
      const now = Date.now();
      const duration = now - pageStart;
      
      this.collect({
        type: "page-stay",
        data: {
          url: currentUrl,
          duration: duration,
          timestamp: now,
        },
        timestamp: now,
      });
      
      if (this.config.debug) {
        console.log(`[ZhiAiWanDebug] Page stay: ${currentUrl} for ${duration}ms`);
      }
    }
  }

  private initReporter(): void {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.reportInterval);
  }

  /**
   * 收集事件数据
   * @param event 事件数据（不包含自动添加的公共字段）
   */
  public collect(event: CollectableEvent): void {
    if (this.config.shouldTrackEvent && !this.config.shouldTrackEvent(event)) {
      return;
    }

    const fullEvent: EventData = {
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timestamp: event.timestamp || Date.now(),
    };
    const transformedEvent = this.config.transformEvent
      ? this.config.transformEvent(fullEvent)
      : fullEvent;

    this.queue.push(transformedEvent);

    if (this.queue.length >= this.config.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 立即上报所有收集的数据
   */
  public flush(): void {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];
    this.stats.lastReport = new Date();

    if (this.config.debug) {
      console.log("[ZhiAiWanDebug] Flushing events:", eventsToSend);
    }

    try {
      const blob = new Blob([JSON.stringify(eventsToSend)], {
        type: "application/json",
      });
      const success = navigator.sendBeacon(this.config.reportUrl, blob);

      if (this.config.debug) {
        console.log(
          `[ZhiAiWanDebug] SendBeacon ${success ? "succeeded" : "failed"}`
        );
      }
    } catch (e) {
      if (this.config.debug) {
        console.error("[ZhiAiWanDebug] SendBeacon failed:", e);
      }

      try {
        const data = JSON.stringify(eventsToSend);
        const image = new Image();
        image.src = `${this.config.reportUrl}?data=${encodeURIComponent(data)}`;

        if (this.config.debug) {
          console.log("[ZhiAiWanDebug] Using image fallback for reporting");
        }
      } catch (fallbackError) {
        if (this.config.debug) {
          console.error(
            "[ZhiAiWanDebug] Image fallback failed:",
            fallbackError
          );
        }
      }
    }
  }

  /**
   * 手动捕获错误
   * @param error 错误对象
   * @param context 额外上下文信息
   */
  public captureError(error: Error, context?: Record<string, any>): void {
    const errorData: ErrorData = {
      message: error.message,
      error: this.serializeError(error),
      timestamp: Date.now(),
      userAction: this.getRecentUserActions(),
    };

    this.collect({
      type: "manual-error",
      data: { ...errorData, context },
      timestamp: Date.now(),
    });

    this.stats.errors++;
  }

  /**
   * 跟踪自定义事件
   * @param eventName 事件名称
   * @param data 自定义数据
   */
  public trackEvent(eventName: string, data?: Record<string, any>): void {
    this.collect({
      type: "custom-event",
      data: {
        name: eventName,
        ...data,
      },
      timestamp: Date.now(),
    });

    this.stats.events++;
  }

  private getRecentUserActions(): UserAction[] {
    return [...this.userActions].reverse();
  }

  private getElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === "string") {
        selector += `.${current.className.trim().replace(/\s+/g, ".")}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  private serializeError(error: Error): {
    name: string;
    message: string;
    stack?: string;
  } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  private log(
    message: string,
    level: "info" | "error" | "warn" | "debug" = "info"
  ): void {
    if (this.config.debug) {
      const logMessage = `[ZhiAiWanDebug] ${message}`;
      switch (level) {
        case "error":
          console.error(logMessage);
          break;
        case "warn":
          console.warn(logMessage);
          break;
        case "debug":
          console.debug(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
  }

  /**
   * 获取当前Web Vitals指标值
   * @param name 指标名称
   * @returns 指标值和评级
   */
  public getMetric(name: WebVitalType): { value: number; rating: string } {
    return this.metrics[name] || { value: 0, rating: "unknown" };
  }

  /**
   * 获取当前会话ID
   * @returns 会话ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 获取用户ID
   * @returns 用户ID
   */
  public getUserId(): string {
    return this.userId;
  }

  /**
   * 更新用户ID（用于登录/登出场景）
   * @param newUserId 新的用户ID
   */
  public setUserId(newUserId: string): void {
    this.userId = newUserId;
    try {
      localStorage.setItem("zaw_user_id", newUserId);
    } catch (e) {
      if (this.config.debug) {
        console.warn("[ZhiAiWanDebug] Failed to persist user ID:", e);
      }
    }
  }

  /**
   * 获取SDK统计信息
   * @returns 统计信息对象
   */
  public getStats() {
    return {
      ...this.stats,
      sessionDuration: Math.floor(
        (Date.now() - this.stats.sessionStart) / 1000
      ),
    };
  }
}