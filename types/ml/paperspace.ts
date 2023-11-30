export const AllowedMachines: string[] = [
  "Ampere A100",
  "Ampere A100 80G",
  "Ampere A4000",
  "Quadro RTX5000",
];

// Hardcode these since they are not returned by API
export const gpuMemory: Record<string, number> = {
  "Ampere A100": 40,
  "Ampere A100 80G": 80,
  "Ampere A4000": 45,
  "Quadro RTX5000": 16,
};

export const AllowedOperatingSystems: string[] = [
  "twnlo3zj", // Ubuntu 20.04 MLiaB
];

export enum PaperspaceStatus {
  Off = "off",
  Provisioning = "provisioning",
  Ready = "ready",
  Restarting = "restarting",
  ServiceReady = "serviceready",
  Starting = "starting",
  Stopping = "stopping",
  Upgrading = "upgrading",
}

export interface OperatingSystemsData {
  data: {
    operatingSystems: {
      nodes: OperatingSystemsNode[];
    };
  };
}

interface OperatingSystemsNode {
  name: string;
  label: string;
  description: null | string;
  note: null | string;
  isAvailable: boolean;
  isLicensed: boolean | null;
  isRecommended: boolean;
  isBase: boolean;
  operatingSystemGroup: OperatingSystemGroup;
  vmTypes: VMTypes;
}

enum OperatingSystemGroup {
  Linux = "Linux",
  Public = "Public",
  Windows = "Windows",
}

interface VMTypes {
  nodes: {
    label: string;
    cpus: number;
    ram: number;
    gpu: string;
    gpuCount: number;
    supportsNvlink: boolean;
    nvlinkGPU: null | string;
    nvlinkGPUCount: number | null;
    defaultUsageRates: DefaultUsageRates;
    templates: Templates;
    osPermissions: OSPermissions;
    regionAvailability: RegionAvailability;
  }[];
}

interface DefaultUsageRates {
  nodes: DefaultUsageRatesNode[];
}

interface DefaultUsageRatesNode {
  description: string;
  rate: number;
  type: Type;
}

enum Type {
  Hourly = "hourly",
  Monthly = "monthly",
}

interface OSPermissions {
  nodes: {
    flag: Flag;
    operatingSystemLabel: string;
  }[];
}

enum Flag {
  IsCPUAvailable = "isCPUAvailable",
  IsP4000Linux = "isP4000Linux",
  IsP4000Windows = "isP4000Windows",
  IsP5000Linux = "isP5000Linux",
  IsP5000Windows = "isP5000Windows",
  IsP6000Linux = "isP6000Linux",
  IsP6000Windows = "isP6000Windows",
  IsV100Linux = "isV100Linux",
  IsV100Windows = "isV100Windows",
}
interface RegionAvailability {
  nodes: {
    regionName: RegionName;
    isAvailable: boolean;
  }[];
}

enum RegionName {
  EastCoastNY2 = "East Coast (NY2)",
  EuropeAMS1 = "Europe (AMS1)",
  WestCoastCA1 = "West Coast (CA1)",
}

interface Templates {
  nodes: {
    id: string;
    agentType: AgentType;
    defaultSizeGB: number | null;
    operatingSystem: OperatingSystem;
  }[];
}

enum AgentType {
  LinuxDesktop = "LinuxDesktop",
  LinuxHeadless = "LinuxHeadless",
  WindowsDesktop = "WindowsDesktop",
}

interface OperatingSystem {
  label: string;
}

export interface StorageRatesData {
  data: {
    storageRates: StorageRates;
  };
}

interface StorageRates {
  nodes: StorageRate[];
}

export interface StorageRate {
  size: number;
  rate: number;
  templateRate: number;
  snapshotRate: number;
}

export interface PaperSpaceOsTemplate {
  id: string;
  name: string;
  label: null | string;
  os: string;
  dtCreated: Date;
}

export interface LoginData {
  id: string;
  ttl: number;
  created: Date;
  userId: number;
  user: User;
  jwtRefreshToken: string;
}

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  dtCreated: Date;
  dtModified: Date;
  isDeleted: boolean;
  isActive: boolean;
  id: number;
  userTeam: UserTeam[];
  teamMemberships: TeamMembership[];
  userInfo: UserInfo;
}

interface TeamMembership {
  userId: number;
  teamId: number;
  adUsername: null;
  isOwner: boolean;
  isAdmin: boolean;
  dtCreated: Date;
  dtModified: Date;
  dtDeleted: null;
  dtConfirmed: Date;
  id: number;
}

interface UserInfo {
  userId: number;
  tags: string;
  gradientSurvey: null;
  cancellationReason: null;
  deactivationSurvey: null;
  referrerCode: null;
  graphcoreTermsAccepted: boolean;
  abuse: boolean;
}

interface UserTeam {
  name: string;
  handle: string;
  stripeID: number;
  isPrivate: boolean;
  isLegacyTeam: boolean;
  isUserTeam: boolean;
  enabledMachineTypes: string[];
  namespace: string;
  id: number;
}
