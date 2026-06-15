// delayUtils.js

/**
 * Determines delay status of a task based on actual and expected dates.
 *
 * @param {string} actualStart - Actual start date (YYYY-MM-DD or DD/MM/YYYY)
 * @param {string} actualEnd - Actual end date (YYYY-MM-DD or DD/MM/YYYY)
 * @param {string} expectedStart - Expected start date (YYYY-MM-DD or DD/MM/YYYY)
 * @param {string} expectedEnd - Expected end date (YYYY-MM-DD or DD/MM/YYYY)
 * @returns {string} - One of: "Start + End Delay", "Start Delay", "End Delay", "Faster than expected", "On Schedule", "Unknown"
 */
export function getDelayStatus(actualStart, actualEnd, expectedStart, expectedEnd) {
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr.includes("/")) {
        const [dd, mm, yyyy] = dateStr.split("/");
        return new Date(`${yyyy}-${mm}-${dd}`);
      }
      return new Date(dateStr);
    };
  
    const aStart = parseDate(actualStart);
    const aEnd = parseDate(actualEnd);
    const eStart = parseDate(expectedStart);
    const eEnd = parseDate(expectedEnd);
  
    if (!aStart || !aEnd || !eStart || !eEnd || isNaN(aStart) || isNaN(aEnd) || isNaN(eStart) || isNaN(eEnd)) {
      return "Unknown";
    }
  
    const startDelayed = aStart > eStart;
    const endDelayed = aEnd > eEnd;
    const fastTrack = aEnd < eEnd;
  
    if (startDelayed && endDelayed) return "Start + End Delay";
    if (startDelayed) return "Start Delay";
    if (endDelayed) return "End Delay";
    if (fastTrack) return "Faster than expected";
    return "On Schedule";
  }
  
  /**
   * Returns a background color for delay status (for node color or badge)
   */
  export const delayColors = {
    "Start + End Delay": "#f8d7da",          // light red
    "Start Delay": "#fff3cd",               // light yellow
    "End Delay": "#fde2e2",                 // very light red
    "Faster than expected": "#d4edda",      // light green
    "On Schedule": "#e2e3e5",               // light gray
    "Unknown": "#f0f0f0",                   // default/fallback
  };
  