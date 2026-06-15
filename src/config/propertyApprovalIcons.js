/**
 * Icon map for property building-approval catalog cards.
 * Keys must match `icon` on each item in `src/data/propertyApprovalCatalog.js`.
 */
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TerrainOutlinedIcon from "@mui/icons-material/TerrainOutlined";
import ArchitectureOutlinedIcon from "@mui/icons-material/ArchitectureOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import ParkOutlinedIcon from "@mui/icons-material/ParkOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import PlumbingOutlinedIcon from "@mui/icons-material/PlumbingOutlined";
import FoundationOutlinedIcon from "@mui/icons-material/FoundationOutlined";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

export const APPROVAL_CATALOG_ICON_MAP = {
  deed: DescriptionOutlinedIcon,
  ec: AssignmentTurnedInOutlinedIcon,
  khata: BadgeOutlinedIcon,
  tax: ReceiptLongOutlinedIcon,
  land: TerrainOutlinedIcon,
  plan: ArchitectureOutlinedIcon,
  commencement: ConstructionOutlinedIcon,
  fire: LocalFireDepartmentOutlinedIcon,
  env: ParkOutlinedIcon,
  water: WaterDropOutlinedIcon,
  electric: BoltOutlinedIcon,
  sewer: PlumbingOutlinedIcon,
  structural: FoundationOutlinedIcon,
  cc: HomeWorkOutlinedIcon,
  oc: VerifiedOutlinedIcon,
};

export const DEFAULT_APPROVAL_CATALOG_ICON = DescriptionOutlinedIcon;

export function getApprovalCatalogIcon(iconKey) {
  if (!iconKey) return DEFAULT_APPROVAL_CATALOG_ICON;
  return APPROVAL_CATALOG_ICON_MAP[iconKey] || DEFAULT_APPROVAL_CATALOG_ICON;
}
