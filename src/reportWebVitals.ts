import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

// ✅ Fix: replaced deprecated onFID with onINP (Interaction to Next Paint)
// onFID was removed in web-vitals v3+
const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onINP(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
