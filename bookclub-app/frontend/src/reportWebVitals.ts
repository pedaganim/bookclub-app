/**
 * Web Vitals reporting utility for performance monitoring
 * Measures and reports Core Web Vitals metrics for the application
 */
import { ReportHandler } from 'web-vitals';

/**
 * Reports web vitals performance metrics
 * Dynamically imports web-vitals library and measures key performance indicators
 * @param onPerfEntry - Optional callback function to handle performance metrics
 */
const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
