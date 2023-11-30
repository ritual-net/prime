import type {
  GPUSpecifications,
  ConfigurationPrice,
  MachineSpecifications,
} from "@type/ml/configuration";
import type { ProviderType } from "@prisma/client";
import { PaperspaceStatus } from "./paperspace";

export type ServerStatus = PaperspaceStatus;

// Aggregated list of statuses
export const RunningStatus = new Set([
  PaperspaceStatus.Ready,
  PaperspaceStatus.ServiceReady,
]);
export const ProvisioningStatus = new Set([PaperspaceStatus.Provisioning]);
export const StoppedStatus = new Set([
  PaperspaceStatus.Off,
  PaperspaceStatus.Stopping,
]);

// Server configurations specified by user
export type ServerConfig = {
  // instance ID
  instance: string;
  // Local name
  name: string;
  // Local description
  description?: string;
  // ML inference provider
  provider: ProviderType;
  // region ID
  region: string;
  // ID of OS configuration
  os: string;
  // Storage in DB
  size: string;
};

// Runtime configuration specified by user
export type RunConfig = Record<string, string | number>;

// Server details returned from ML provider
export type ProviderServer = {
  // Server ID
  id: string;
  // Server IP Address
  ip: string;
  // Server operating system
  os: string;
  // Server status
  status: ServerStatus;
  // Server billing details
  price: ConfigurationPrice;
  // Server specs
  specs: Omit<MachineSpecifications, "storageCost"> & {
    // GPU details
    gpu: GPUSpecifications;
  };
};

// Server details from database
export type DBServer = {
  // Server name
  name: string;
  // Server description
  description: string | null;
  // Server provider
  provider: ProviderType;
  // Server creation date
  createdAt: Date;
  // ML model deployed
  model?: string;
};

// Server details (local database + remote provider)
export type Server = DBServer & ProviderServer;
export type ServerMetadata = { id: string; name: string };

// Server toggleable action
export enum ServerAction {
  Start = "start",
  Stop = "stop",
}
