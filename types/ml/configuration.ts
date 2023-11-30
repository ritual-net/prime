export type ConfigurationPrice = {
  // Hourly price
  hourly: number;
  // Monthly price
  monthly?: number;
};

export type ConfigurationRegion = {
  // Region id
  id: string;
  // Region country
  country: string;
  // Region description
  description: string;
};

export type MachineSpecifications = {
  // vCPU count
  cores: number;
  // RAM amount in GB
  ram: number;
  // Storage cost and size in GB
  storageCost: StorageCost[];
};

export type GPUSpecifications = {
  // GPU model
  model: string;
  // GPU count
  count: number;
};

export type StorageCost = {
  // Storage size in GB
  size: string;
  // Montly price
  monthly: number;
};

export type OperatingSystem = {
  // Operating system id
  id: string;
  // Operating system description
  label: string;
};

export type Configuration = {
  // Configuration ID
  id: string;
  // GPU Specifications
  gpu: GPUSpecifications;
  // Configuration price
  price: ConfigurationPrice;
  // Machine specifications
  specs: MachineSpecifications;
  // Options for OS
  os: OperatingSystem[];
  // Available regions
  regions: ConfigurationRegion[];
};
