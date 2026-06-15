/**
 * Payslip calculation and display configuration.
 * Change these to match your business rules without editing PaySlipDialog logic.
 *
 * Override via env (optional):
 *   REACT_APP_PAYSLIP_SKILLED_UNSKILLED_PER_DAY=true|false
 *   REACT_APP_PAYSLIP_CONTRACTOR_MULTIPLIER_DAILY=true
 *   REACT_APP_PAYSLIP_CONTRACTOR_MULTIPLIER_HOURLY=true
 */

const fromEnv = (key, fallback) => {
  if (typeof process !== "undefined" && process.env && process.env[key] != null) {
    const v = process.env[key];
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
    return v;
  }
  return fallback;
};

/** Company branding for PDF and header */
export const company = {
  name: "Avenue Realty",
  watermark: "Avenue",
  logo: "https://avenuerealty.in/wp-content/uploads/2022/12/cropped-Avenue-reality-logo.png",
  footerNote: "© Avenue Realty. System generated payslip. Contact HR for queries.",
};

/**
 * When true: Skilled/Unskilled amount = rate × count × totalDays (rate = per worker per day).
 * When false: Skilled/Unskilled amount = rate × count (lump sum per worker).
 */
export const skilledUnskilledMultiplyByDays = fromEnv(
  "REACT_APP_PAYSLIP_SKILLED_UNSKILLED_PER_DAY",
  true
);

/**
 * Apply contractor headcount multiplier to these earning types.
 * Only "daily" and "hourly" are supported in the UI today; others are for future use.
 */
export const contractorMultiplierAppliesTo = {
  daily: fromEnv("REACT_APP_PAYSLIP_CONTRACTOR_MULTIPLIER_DAILY", true),
  hourly: fromEnv("REACT_APP_PAYSLIP_CONTRACTOR_MULTIPLIER_HOURLY", true),
  // sqft: false, cbm: false, ... (unit-based stay as rate × quantity)
};

/** Default payment modes shown in the dropdown */
export const paymentModes = ["Cash", "Bank Transfer", "UPI"];

// ---------------------------------------------------------------------------
// Constraints (business rules)
// ---------------------------------------------------------------------------

/**
 * Constraints can be overridden via env (optional):
 *   REACT_APP_PAYSLIP_ALLOW_MULTIPLE_COMPONENTS=true|false
 *   REACT_APP_PAYSLIP_DISALLOW_DAILY_AND_HOURLY=true|false
 *   REACT_APP_PAYSLIP_DISALLOW_DIRECT_GROSS_WITH_COMPONENTS=true|false
 *   REACT_APP_PAYSLIP_DISALLOW_UNIT_WITH_TIME=true|false
 *   REACT_APP_PAYSLIP_DISALLOW_TIME_WITH_SKILL=true|false
 *   REACT_APP_PAYSLIP_DISALLOW_UNIT_WITH_SKILL=true|false
 *
 * Notes:
 * - "unit" means: sqft/cbm/rft/m3/auger12/auger15/auger18/cbft
 * - "time" means: daily/hourly
 * - "skill" means: skilled/unskilled
 */
export const payslipConstraints = {
  allowMultipleComponents: fromEnv("REACT_APP_PAYSLIP_ALLOW_MULTIPLE_COMPONENTS", true),
  disallowDailyAndHourly: fromEnv("REACT_APP_PAYSLIP_DISALLOW_DAILY_AND_HOURLY", true),
  disallowDirectGrossWithComponents: fromEnv(
    "REACT_APP_PAYSLIP_DISALLOW_DIRECT_GROSS_WITH_COMPONENTS",
    true
  ),
  disallowUnitWithTime: fromEnv("REACT_APP_PAYSLIP_DISALLOW_UNIT_WITH_TIME", false),
  disallowTimeWithSkill: fromEnv("REACT_APP_PAYSLIP_DISALLOW_TIME_WITH_SKILL", false),
  disallowUnitWithSkill: fromEnv("REACT_APP_PAYSLIP_DISALLOW_UNIT_WITH_SKILL", false),
};

const getSelectedEarningComponents = (form) => {
  const selected = [];
  earningsFormulas.forEach((def) => {
    if (form?.[def.useKey]) selected.push(def.key);
  });
  return selected;
};

const componentGroups = {
  time: new Set(["daily", "hourly"]),
  skill: new Set(["skilled", "unskilled"]),
  unit: new Set(["sqft", "cbm", "rft", "m3", "auger12", "auger15", "auger18", "cbft"]),
};

const hasAnyInGroup = (selected, groupSet) => selected.some((k) => groupSet.has(k));

// ---------------------------------------------------------------------------
// Earnings formulas (single source of truth for how each component is calculated)
// ---------------------------------------------------------------------------

const roundCurrency = (val) =>
  Number.isFinite(val) ? Math.round(Number(val) * 100) / 100 : 0;

/**
 * Formula types:
 * - rate_times_quantity          → amount = rate × quantity
 * - rate_times_quantity_times_contractor → amount = rate × quantity × contractorMultiplier (when config allows)
 * - rate_times_quantity_times_days_if_config → amount = rate × quantity × days when skilledUnskilledMultiplyByDays && days>0, else rate × quantity
 */
export const EARNINGS_FORMULA = {
  RATE_TIMES_QUANTITY: "rate_times_quantity",
  RATE_TIMES_QUANTITY_TIMES_CONTRACTOR: "rate_times_quantity_times_contractor",
  RATE_TIMES_QUANTITY_TIMES_DAYS_IF_CONFIG: "rate_times_quantity_times_days_if_config",
};

/**
 * Defines each earning type: form keys and which formula to use.
 * Order here matches display order in the dialog.
 */
export const earningsFormulas = [
  {
    key: "daily",
    partAmount: "dayAmt",
    partQuantity: "days",
    quantityKey: "totalDays",
    rateKey: "dailyRate",
    useKey: "useDaily",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_CONTRACTOR,
    parseQuantity: (v) => parseInt(v || 0, 10),
  },
  {
    key: "hourly",
    partAmount: "hourAmt",
    partQuantity: "hours",
    quantityKey: "totalHoursWorked",
    rateKey: "hourlyRate",
    useKey: "useHourly",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_CONTRACTOR,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "sqft",
    partAmount: "sqftAmt",
    partQuantity: "sqft",
    quantityKey: "totalSqftCompleted",
    rateKey: "sqftRate",
    useKey: "useSqft",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "cbm",
    partAmount: "cbmAmt",
    partQuantity: "cbm",
    quantityKey: "totalCubicMeter",
    rateKey: "cbmRate",
    useKey: "useCBM",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "rft",
    partAmount: "rftAmt",
    partQuantity: "rft",
    quantityKey: "totalRft",
    rateKey: "rftRate",
    useKey: "useRft",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "m3",
    partAmount: "m3Amt",
    partQuantity: "m3",
    quantityKey: "totalM3",
    rateKey: "m3Rate",
    useKey: "useM3",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "auger12",
    partAmount: "auger12Amt",
    partQuantity: "auger12",
    quantityKey: "totalAuger12",
    rateKey: "auger12Rate",
    useKey: "useAuger12",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "auger15",
    partAmount: "auger15Amt",
    partQuantity: "auger15",
    quantityKey: "totalAuger15",
    rateKey: "auger15Rate",
    useKey: "useAuger15",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "auger18",
    partAmount: "auger18Amt",
    partQuantity: "auger18",
    quantityKey: "totalAuger18",
    rateKey: "auger18Rate",
    useKey: "useAuger18",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "cbft",
    partAmount: "cbftAmt",
    partQuantity: "cbft",
    quantityKey: "totalCbft",
    rateKey: "cbftRate",
    useKey: "useCbft",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "skilled",
    partAmount: "skilledAmt",
    partQuantity: "skilledCount",
    quantityKey: "skilledCount",
    rateKey: "skilledRate",
    useKey: "useSkilled",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_DAYS_IF_CONFIG,
    parseQuantity: (v) => parseFloat(v || 0),
  },
  {
    key: "unskilled",
    partAmount: "unskilledAmt",
    partQuantity: "unskilledCount",
    quantityKey: "unskilledCount",
    rateKey: "unskilledRate",
    useKey: "useUnskilled",
    formula: EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_DAYS_IF_CONFIG,
    parseQuantity: (v) => parseFloat(v || 0),
  },
];

/**
 * Compute all earning parts and total from form state and context.
 * @param {Object} form - Form state (useXXX, XXXRate, quantity keys)
 * @param {Object} context - { contractorMultiplier, contractorMultiplierAppliesTo, skilledUnskilledMultiplyByDays }
 * @returns {{ parts: Object, total: number }}
 */
export function computeEarnings(form, context) {
  const days = parseInt(form.totalDays || 0, 10);
  const parts = {};

  earningsFormulas.forEach((def) => {
    const quantity = def.parseQuantity(form[def.quantityKey]);
    const rate = parseFloat(form[def.rateKey] || 0);
    const use = !!form[def.useKey];

    parts[def.partQuantity] = quantity;

    let amount = 0;
    if (use) {
      switch (def.formula) {
        case EARNINGS_FORMULA.RATE_TIMES_QUANTITY:
          amount = rate * quantity;
          break;
        case EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_CONTRACTOR: {
          const mult = context.contractorMultiplierAppliesTo[def.key]
            ? context.contractorMultiplier
            : 1;
          amount = rate * quantity * mult;
          break;
        }
        case EARNINGS_FORMULA.RATE_TIMES_QUANTITY_TIMES_DAYS_IF_CONFIG:
          if (context.skilledUnskilledMultiplyByDays && days > 0) {
            // Real-world case: skilled/unskilled headcount can vary per day.
            // If date-wise entries are available, prefer "man-days" totals:
            // Example: 5th=5, 6th=4 → manDays=9 (not count×days).
            const manDays =
              def.key === "skilled"
                ? context?.skilledManDays
                : def.key === "unskilled"
                  ? context?.unskilledManDays
                  : null;
            amount = Number.isFinite(manDays) ? rate * manDays : rate * quantity * days;
          } else {
            amount = rate * quantity;
          }
          break;
        default:
          amount = rate * quantity;
      }
    }
    parts[def.partAmount] = roundCurrency(amount);
  });

  const partAmounts = earningsFormulas.map((def) => parts[def.partAmount]);
  const total = roundCurrency(partAmounts.reduce((a, b) => a + b, 0));

  return {
    parts: { ...parts },
    total: Number.isFinite(total) ? total : 0,
  };
}

// ---------------------------------------------------------------------------
// Policy layer: prevent invalid combos (coerce) + validate before submit (clean & scalable)
// ---------------------------------------------------------------------------

/**
 * Coerce policies run on change: when condition matches, return form updates to apply.
 * Prevents invalid combinations by auto-fixing (e.g. Cash → TDS 0).
 */
export const coercePolicies = [
  {
    id: "cash_no_tds",
    when: (form) => form.paymentMode === "Cash",
    apply: () => ({ tdsPercent: "0" }),
  },
  {
    id: "direct_gross_disables_components",
    when: (form) =>
      payslipConstraints.disallowDirectGrossWithComponents && !!form.useDirectGross,
    apply: () => ({
      useDaily: false,
      useHourly: false,
      useSqft: false,
      useCBM: false,
      useRft: false,
      useM3: false,
      useAuger12: false,
      useAuger15: false,
      useAuger18: false,
      useCbft: false,
      useSkilled: false,
      useUnskilled: false,
    }),
  },
];

/**
 * Validation policies run on submit: each returns { valid, message? }.
 * context: { gross, netPay, isAnyComponentSelected, workerData }
 */
export const validationPolicies = [
  {
    id: "required_identity",
    check: (form, ctx) => {
      const missing = [
        ["Worker ID", form.workerId || ctx?.workerData?.worker_id],
        ["Worker Name", form.workerName || ctx?.workerData?.worker_name],
        ["Worker Type", form.workerType || ctx?.workerData?.worker_type],
      ]
        .filter(([, value]) => !String(value || "").trim())
        .map(([label]) => label);
      return {
        valid: missing.length === 0,
        message: `Missing required system data: ${missing.join(", ")}. Refresh Work Summary and reopen this payslip from the worker row.`,
      };
    },
  },
  {
    id: "required_property",
    check: (form, ctx) => ({
      valid: !!(form.propertyId || ctx?.workerData?.property_id),
      message:
        "Property ID is required. Please ensure the worker has an associated property.",
    }),
  },
  {
    id: "at_least_one_component",
    check: (form, ctx) => {
      const hasComponents = !!ctx?.isAnyComponentSelected;
      const hasDirectGross =
        !!ctx?.useDirectGross && Number(form.directGrossAmount || 0) > 0;
      return {
        valid: hasComponents || hasDirectGross,
        message:
          "Please select at least one earning component or enter direct gross amount.",
      };
    },
  },
  {
    id: "component_constraints",
    check: (form) => {
      const selected = getSelectedEarningComponents(form);

      if (!payslipConstraints.allowMultipleComponents && selected.length > 1) {
        return {
          valid: false,
          message: "Please select only one earning component (multiple components are not allowed).",
        };
      }

      if (
        payslipConstraints.disallowDailyAndHourly &&
        selected.includes("daily") &&
        selected.includes("hourly")
      ) {
        return {
          valid: false,
          message: "Please choose either Daily or Hourly (not both).",
        };
      }

      const hasTime = hasAnyInGroup(selected, componentGroups.time);
      const hasUnit = hasAnyInGroup(selected, componentGroups.unit);
      const hasSkill = hasAnyInGroup(selected, componentGroups.skill);

      if (payslipConstraints.disallowUnitWithTime && hasUnit && hasTime) {
        return {
          valid: false,
          message: "Unit-based components (Sqft/CBM/etc.) cannot be combined with Daily/Hourly.",
        };
      }

      if (payslipConstraints.disallowTimeWithSkill && hasTime && hasSkill) {
        return {
          valid: false,
          message: "Daily/Hourly cannot be combined with Skilled/Unskilled.",
        };
      }

      if (payslipConstraints.disallowUnitWithSkill && hasUnit && hasSkill) {
        return {
          valid: false,
          message: "Unit-based components (Sqft/CBM/etc.) cannot be combined with Skilled/Unskilled.",
        };
      }

      return { valid: true };
    },
  },
  {
    id: "gross_positive",
    check: (form, ctx) => ({
      valid: (ctx?.gross ?? 0) > 0,
      message:
        "Gross amount must be greater than 0. Please select at least one earning component and enter rates.",
    }),
  },
  {
    id: "rate_required_when_quantity",
    check: (form) => {
      const labels = {
        totalSqftCompleted: "Sqft",
        totalRft: "RFT",
        totalM3: "M³",
        totalAuger12: "Auger 12",
        totalAuger15: "Auger 15",
        totalAuger18: "Auger 18",
        totalCbft: "CBFT",
        totalCubicMeter: "CBM",
        totalDays: "Daily",
        totalHoursWorked: "Hourly",
        skilledCount: "Skilled",
        unskilledCount: "Unskilled",
      };
      for (const def of earningsFormulas) {
        const q = def.parseQuantity(form[def.quantityKey]);
        const use = !!form[def.useKey];
        const rate = parseFloat(form[def.rateKey] || 0);
        if (use && q > 0 && rate <= 0) {
          const label = labels[def.quantityKey] || def.key;
          return {
            valid: false,
            message: `${label} rate is required when ${label} work/workers are used.`,
          };
        }
      }
      return { valid: true };
    },
  },
  {
    id: "net_positive",
    check: (form, ctx) => ({
      valid: (ctx?.netPay ?? 0) > 0,
      message:
        "Net pay must be greater than 0. Please check your TDS percentage.",
    }),
  },
];

/**
 * Run coerce policies; returns updates to merge into form (prevents invalid combos).
 */
export function runCoercePolicies(form) {
  let updates = {};
  coercePolicies.forEach((policy) => {
    if (policy.when(form)) {
      updates = { ...updates, ...policy.apply(form) };
    }
  });
  return updates;
}

/**
 * Run validation policies; returns { valid, errors } for submit.
 */
export function runValidationPolicies(form, context = {}) {
  const errors = [];
  for (const policy of validationPolicies) {
    const result = policy.check(form, context);
    if (result && result.valid === false && result.message) {
      errors.push(result.message);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}