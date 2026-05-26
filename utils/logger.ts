const isDevelopment = import.meta.env.DEV;

export const devLog = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[civitai-dl]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error('[civitai-dl]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[civitai-dl]', ...args);
    }
  },
};

export const logger = isDevelopment
  ? devLog
  : {
      log: () => {},
      error: () => {},
      warn: () => {},
    };
