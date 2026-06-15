/**
 * Checklist templates for property building approvals (pre / during / post construction).
 * UI matches catalog by `key` on saved approvals (`catalogKey`) or by title match.
 *
 * Card icons: each `icon` string must exist in `src/config/propertyApprovalIcons.js` (APPROVAL_CATALOG_ICON_MAP).
 */

export const APPROVAL_PHASES = [
  {
    id: "pre",
    label: "Pre-Construction",
    dotColor: "#166534",
    items: [
      {
        key: "sale_deed",
        title: "Sale Deed / Title Deed",
        authority: "Sub-Registrar Office",
        description: "Registered ownership document proving legal title to the land.",
        icon: "deed",
      },
      {
        key: "encumbrance",
        title: "Encumbrance Certificate (EC)",
        authority: "Sub-Registrar Office",
        description: "Confirms the property is free of legal/financial liabilities.",
        icon: "ec",
      },
      {
        key: "khata_patta",
        title: "Khata / Patta Certificate",
        authority: "Municipal Corporation / Panchayat",
        description: "Property registration record for tax and ownership identification.",
        icon: "khata",
      },
      {
        key: "property_tax",
        title: "Property Tax Receipts",
        authority: "Local Municipal Body",
        description: "Up-to-date property tax payment receipts.",
        icon: "tax",
      },
      {
        key: "land_conversion",
        title: "Land Use Conversion (DC Conversion)",
        authority: "Revenue Department",
        description: "Conversion from agricultural to residential use, if applicable.",
        icon: "land",
      },
      {
        key: "building_plan",
        title: "Building Plan Approval",
        authority: "Municipal Corporation / Town Planning",
        description: "Sanctioned building plan as per local bye-laws and FAR.",
        icon: "plan",
      },
      {
        key: "commencement",
        title: "Commencement Certificate",
        authority: "Municipal Corporation",
        description: "Permission to begin construction at site.",
        icon: "commencement",
      },
      {
        key: "fire_noc",
        title: "Fire Department NOC",
        authority: "Fire & Emergency Services",
        description: "Required for villas above prescribed height/area.",
        icon: "fire",
      },
      {
        key: "environmental",
        title: "Environmental Clearance",
        authority: "SEIAA / MoEF",
        description: "Required for plots above the prescribed built-up area threshold.",
        icon: "env",
      },
    ],
  },
  {
    id: "during",
    label: "During Construction",
    dotColor: "#0d9488",
    items: [
      {
        key: "water_connection",
        title: "Water Connection Approval",
        authority: "Water Supply Board",
        description: "Sanction for domestic water connection.",
        icon: "water",
      },
      {
        key: "electricity_connection",
        title: "Electricity Connection Approval",
        authority: "DISCOM / Electricity Board",
        description: "Permission for permanent or temporary power supply.",
        icon: "electric",
      },
      {
        key: "sewerage",
        title: "Sewerage / Drainage NOC",
        authority: "Municipal Corporation",
        description: "Approval for connecting to municipal sewer/drain network.",
        icon: "sewer",
      },
      {
        key: "structural_stability",
        title: "Structural Stability Certificate",
        authority: "Licensed Structural Engineer",
        description: "Certifies structural safety at key construction stages.",
        icon: "structural",
      },
    ],
  },
  {
    id: "post",
    label: "Post-Construction",
    dotColor: "#0d9488",
    items: [
      {
        key: "completion_cert",
        title: "Completion Certificate (CC)",
        authority: "Municipal Corporation",
        description: "Certifies construction completed as per approved plan.",
        icon: "cc",
      },
      {
        key: "occupancy_cert",
        title: "Occupancy Certificate (OC)",
        authority: "Municipal Corporation",
        description: "Authorizes occupation of the building after completion.",
        icon: "oc",
      },
    ],
  },
];
