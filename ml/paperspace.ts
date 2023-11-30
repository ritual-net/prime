import type { BaseProvider } from "@ml/base";
import { ProviderType } from "@prisma/client";
import type {
  Configuration,
  OperatingSystem,
  StorageCost,
} from "@type/ml/configuration";
import axios, { type AxiosInstance, AxiosError } from "axios";
import type { ProviderServer, RunConfig, ServerConfig } from "@type/ml/server";
import {
  AllowedMachines,
  AllowedOperatingSystems,
  LoginData,
  OperatingSystemsData,
  PaperSpaceOsTemplate,
  StorageRate,
  StorageRatesData,
  User,
  gpuMemory,
} from "@type/ml/paperspace";
import db from "@db/index";
import { formatScript } from "@utils/tgi";

// Constants
const PAPERSPACE_API_BASE_URL: string = "https://api.paperspace.io";
const PAPERSPACE_PRIVATE_API_BASE_URL: string = "https://api.paperspace.com";

export class PaperSpaceProvider implements BaseProvider {
  // PaperSpaceProvider API client
  private readonly client: AxiosInstance;
  private apiKey: string;

  // PaperSpaceProvider Private API credentials
  private privateClient: AxiosInstance;
  private email?: string;
  private password?: string;
  private authToken?: string;
  private namespace?: string;

  /**
   * Initializes new PaperSpaceProvider
   * @param {string} apiKey PaperSpace API key
   * @param {string} email PaperSpace email
   * @param {string} password PaperSpace password
   */
  constructor(apiKey: string, email?: string, password?: string) {
    // Create client
    this.client = axios.create({
      baseURL: PAPERSPACE_API_BASE_URL,
      headers: {
        "X-Api-Key": `${apiKey}`,
      },
    });
    this.apiKey = apiKey;

    // Create private API client
    this.privateClient = axios.create({
      baseURL: PAPERSPACE_PRIVATE_API_BASE_URL,
    });
    this.email = email;
    this.password = password;
  }

  type(): ProviderType {
    return ProviderType.PAPERSPACE;
  }

  // Checks that public and private API credentials are valid
  async isAuth(): Promise<boolean> {
    return (await this.isPublicAuth()) && (await this.checkPrivateAuth());
  }

  // Checks that public API credentials are valid
  private async isPublicAuth(): Promise<boolean> {
    try {
      // Collect server list to verify keys
      await this.client.get("/machines/getMachines", { data: { limit: 1 } });
      // Return true if 200
      return true;
    } catch (e: unknown) {
      // Force to AxiosError
      const error = e as AxiosError;

      // Check for Bad Request / Unauthorized
      if (error.response?.status === 400 || error.response?.status === 401) {
        return false;
      }

      // Else, return true
      return true;
    }
  }

  // Headers for private API
  privateHeaders() {
    return {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      authorization: `token ${this.namespace}_${this.authToken}`,
      "content-type": "application/json",
      origin: "https://console.paperspace.com",
      referer: "https://console.paperspace.com/",
    };
  }

  /**
   * For private API only
   * Extracts namespace for private API requests. Defaults to team's namespace, otherwise user's personal.
   * @returns {string} namespace for private API
   * @throws {Error} if request fails
   */
  private async getNamespace(user: User): Promise<string | undefined> {
    try {
      // Select non-personal team if available
      const personalTeam = user.userTeam.find((team) => team.isUserTeam);
      const teamId =
        user.teamMemberships.length == 1
          ? user.teamMemberships[0].teamId
          : user.teamMemberships.find((team) => team.teamId != personalTeam?.id)
              ?.teamId;

      // Get team's namespace
      const {
        data: { namespace },
      } = await axios.get(
        `https://api.paperspace.io/teams/${teamId}/showTeam`,
        {
          params: {
            access_token: this.authToken,
          },
          headers: {
            authority: "api.paperspace.io",
            ...this.privateHeaders(),
          },
        },
      );

      return namespace;
    } catch (e) {
      console.error(`Error getting namespace: ${e}`);
    }
  }

  /**
   * For private API only
   * Login flow with private credentials; loads and stores authToken, namespace if successful
   * @returns {boolean} true if login succeeded and authToken, namespace were stored
   * @throws {Error} if login or persisting credentials in db fails
   */
  private async login(): Promise<boolean> {
    try {
      const {
        data: { id: authToken, user },
      } = await axios.post<LoginData>(
        "https://api.paperspace.io/users/login",
        {
          email: this.email,
          password: this.password,
          clientFingerprint: "893bbf8dd5fd92f760c8590f202e56c7",
          PS_REQUEST_VALIDATION_KEY:
            "Nu/CfHRkn2A1YqTQHNfzrWgIJF+iV/0B+QfTXDcya2g=",
        },
        {
          headers: {
            authority: "api.paperspace.io",
            ...this.privateHeaders(),
          },
        },
      );

      this.authToken = authToken;
      this.namespace = await this.getNamespace(user);

      // Update authToken in db
      const provider = await db.provider.upsert({
        where: { type: this.type() },
        create: {
          type: this.type(),
          key: this.apiKey,
          email: this.email,
          password: this.password,
        },
        update: {
          key: this.apiKey,
          email: this.email,
          password: this.password,
          authToken: this.authToken,
          namespace: this.namespace,
        },
      });
      return Boolean(provider);
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
  }

  /**
   * For private API only
   * Loads Paperspace authToken, namespace from db
   */
  private async loadAuthFromDb() {
    try {
      const thisProvider = await db.provider.findFirst({
        where: {
          type: this.type(),
        },
      });
      this.authToken = thisProvider?.authToken ?? undefined;
      this.namespace = thisProvider?.namespace ?? undefined;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * For private API only
   * Check validity of private API token
   * @returns {boolean} true if authToken is valid
   * @throws {Error} if private API authentication fails
   */
  private async isPrivateAuth(): Promise<boolean> {
    try {
      await this.privateClient.post(
        "/graphql",
        {
          query:
            "query PendingTeamMemberships($first: Int) {\n  pendingTeamMemberships(first: $first) {\n    nodes {\n      userId\n      teamId\n      __typename\n    }\n    __typename\n  }\n}\n",
          operationName: "PendingTeamMemberships",
          variables: {
            first: 10,
          },
        },
        {
          headers: {
            authority: "api.paperspace.com",
            ...this.privateHeaders(),
          },
        },
      );

      return true;
    } catch (e: unknown) {
      // Force to AxiosError
      const error = e as AxiosError;

      // Check for Bad Request / Unauthorized
      if (error.response?.status === 400 || error.response?.status === 401) {
        console.error("Private API unauthorized.");
        return false;
      }

      // Else, return true
      return true;
    }
  }

  /**
   * For private API only
   * Refreshes authToken with user credentials
   * @returns {boolean} true if new authToken successfully obtained
   */
  private async refreshToken(): Promise<boolean> {
    // Credentials are provided in constructor when user is updating them
    // If not provided in constructor, read them from db
    if (!this.email || !this.password) {
      try {
        const thisProvider = await db.provider.findFirst({
          where: {
            type: this.type(),
          },
        });

        if (!thisProvider || !thisProvider?.email || !thisProvider?.password)
          return false;

        this.email = thisProvider.email;
        this.password = thisProvider.password;
      } catch {
        return false;
      }
    }

    // Try refreshing token
    return await this.login();
  }

  /**
   * For private API only
   * Should be ran before any private API calls
   *
   * Check validity of stored authToken, or create new authToken if necessary.
   * @returns {boolean} true if authToken is valid or was successfully created
   */
  private async checkPrivateAuth(): Promise<boolean> {
    // Load authToken, namespace from db
    if (!this.authToken || !this.namespace) await this.loadAuthFromDb();

    // Check if user is (still) authenticated
    if (await this.isPrivateAuth()) return true;

    // Obtain new authToken, namespace
    return await this.refreshToken();
  }

  private async transformStorageRates(
    data: StorageRate[],
  ): Promise<StorageCost[]> {
    return data.map((rateObj) => {
      return {
        monthly: rateObj.rate,
        size: rateObj.size.toString(),
      };
    });
  }

  /**
   * Fetches rates for disk storage and transform them
   * @returns {Promise<StorageCost[]>} list of transformed storage costs
   * @throws {Error} if request or transformation fails
   */
  private async getStorageRates(): Promise<StorageCost[]> {
    try {
      if (!(await this.checkPrivateAuth())) {
        throw new Error("Authentication failed.");
      }

      const { data } = await this.privateClient.post<StorageRatesData>(
        "/graphql",
        {
          query:
            "query StorageRates($first: Int) {\n  storageRates(first: $first) {\n    nodes {\n      size\n      rate\n      templateRate\n      snapshotRate\n      __typename\n    }\n    __typename\n  }\n}\n",
          operationName: "StorageRates",
          variables: {
            first: 20,
          },
        },
        {
          headers: {
            authority: "api.paperspace.com",
            ...this.privateHeaders(),
          },
        },
      );

      return this.transformStorageRates(data.data.storageRates.nodes);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      if (e instanceof Error) {
        // Passthrough string error
        throw new Error(e.message);
      }

      // Fail with undefined error
      throw new Error(`Error getting storage rates.`);
    }
  }

  /**
   * Transforms and deduplicates templates, splitting windows OS from other
   * @param templates OS templates
   * @returns OperatingSystem objects for windows and other
   */
  private async transformTemplates(templates: PaperSpaceOsTemplate[]): Promise<{
    windows: OperatingSystem[];
    other: OperatingSystem[];
  }> {
    const windowsTemplates = new Map<string, PaperSpaceOsTemplate>();
    const otherTemplates = new Map<string, PaperSpaceOsTemplate>();

    templates
      // Only allow select Operating Systems
      .filter((template) => AllowedOperatingSystems.includes(template.id))
      .forEach((template) => {
        // Separate windows templates from rest
        if (template.os.toLowerCase().includes("windows")) {
          // for each os, only keep latest version
          if (
            !windowsTemplates.has(template.os) ||
            windowsTemplates.get(template.os)!.dtCreated < template.dtCreated
          ) {
            windowsTemplates.set(template.os, template);
          }
        } else {
          // for each os, only keep latest version
          if (
            !otherTemplates.has(template.os) ||
            otherTemplates.get(template.os)!.dtCreated < template.dtCreated
          ) {
            otherTemplates.set(template.os, template);
          }
        }
      });

    return {
      windows: Array.from(windowsTemplates.values())
        .sort((a: PaperSpaceOsTemplate, b: PaperSpaceOsTemplate) => {
          return a.os.toLowerCase() < b.os.toLowerCase() ? -1 : 1;
        })
        .map((template) => {
          return {
            id: template.id,
            label: template.os,
          };
        }),
      other: Array.from(otherTemplates.values())
        .sort((a: PaperSpaceOsTemplate, b: PaperSpaceOsTemplate) => {
          return a.os.toLowerCase() < b.os.toLowerCase() ? -1 : 1;
        })
        .map((template) => {
          return {
            id: template.id,
            label: template.os,
          };
        }),
    };
  }

  /**
   * Fetches OS templates and transforms them
   * @returns transformed OS templates, separated by OS
   * @throws {Error} if request or transformation fails
   */
  private async getOsTemplates(): Promise<{
    windows: OperatingSystem[];
    other: OperatingSystem[];
  }> {
    try {
      // Collect single server
      const { data } = await this.client.get<PaperSpaceOsTemplate[]>(
        "/templates/getTemplates",
      );

      // Transform server
      return this.transformTemplates(data);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      if (e instanceof Error) {
        // Passthrough string error
        throw new Error(e.message);
      }

      // Fail with undefined error
      throw new Error(`Error collecting templates.`);
    }
  }

  /**
   * Transforms private API data to base-conforming Configuration objects
   * @param data OperatingSystemsData response from private api
   * @returns {Promise<Configuration[]>} Configuration object array
   */
  private async transformConfigurations(
    data: OperatingSystemsData,
  ): Promise<Configuration[]> {
    const machineMap: Record<string, Configuration> = {};
    const storageRates = await this.getStorageRates();
    const { windows: windowsTemplates, other: otherTemplates } =
      await this.getOsTemplates();

    data.data.operatingSystems.nodes.forEach((os) => {
      os.vmTypes.nodes
        // Only allow select machines
        .filter((vmType) => AllowedMachines.includes(vmType.gpu))
        .forEach((vmType) => {
          const usageRate = vmType.defaultUsageRates.nodes.find((usageRate) =>
            usageRate.description.endsWith(" hourly"),
          )?.rate;
          if (!usageRate) return;

          const config = {
            id: `${vmType.label}`,
            gpu: {
              model: vmType.gpu,
              count: vmType.gpuCount,
            },
            price: {
              hourly: usageRate,
            },
            // "GRID" machines only work with Windows templates
            os: vmType.gpu.toLowerCase().includes("grid")
              ? windowsTemplates
              : otherTemplates,
            specs: {
              cores: vmType.cpus,
              // gpu ram
              ram:
                vmType.gpu in gpuMemory
                  ? vmType.gpuCount * gpuMemory[vmType.gpu]
                  : -1,
              storageCost: storageRates.map((storageRate) => {
                return {
                  size: storageRate.size.toString(),
                  monthly: storageRate.monthly,
                };
              }),
            },
            regions: vmType.regionAvailability.nodes
              .filter((node) => node.isAvailable)
              .map((node) => {
                return {
                  id: node.regionName,
                  description: node.regionName,
                  country: "",
                };
              })
              .sort((a, b) => {
                return a.description.toLowerCase() < b.description.toLowerCase()
                  ? -1
                  : 1;
              }),
          } as Configuration;

          // Exclude machines not available in any region
          if (config.regions.length === 0) return;

          // Deduplicate machine types
          if (!(vmType.label in machineMap)) {
            machineMap[vmType.label] = config;
          }
        });
    });

    // Sort alphabetically by GPU
    return Object.values(machineMap).sort(
      (a: Configuration, b: Configuration) => {
        return a.gpu.model.toLowerCase() < b.gpu.model.toLowerCase() ? -1 : 1;
      },
    );
  }

  /**
   * Uses private API to fetch machine configurations, and transforms them
   * @returns {Promise<Configuration[]>} transformed configuration list
   * @throws {Error} if request or transformation fails
   */
  public async getConfigurations(): Promise<Configuration[]> {
    try {
      if (!(await this.checkPrivateAuth())) {
        throw new Error("Authentication failed.");
      }

      const { data } = await this.privateClient.post<OperatingSystemsData>(
        "/graphql",
        {
          query:
            "query OperatingSystems($osFirst: Int, $vmTypeFirst: Int) {\n  operatingSystems(first: $osFirst) {\n    nodes {\n      name\n      label\n      description\n      note\n      isAvailable\n      isLicensed\n      isRecommended\n      isBase\n      operatingSystemGroup\n      vmTypes(first: $vmTypeFirst) {\n        nodes {\n          label\n          cpus\n          ram\n          gpu\n          gpuCount\n          supportsNvlink\n          nvlinkGpu\n          nvlinkGpuCount\n          defaultUsageRates(first: 5) {\n            nodes {\n              description\n              rate\n              type\n              __typename\n            }\n            __typename\n          }\n          templates(first: 100) {\n            nodes {\n              id\n              agentType\n              defaultSizeGb\n              ... on PublicTemplate {\n                operatingSystem {\n                  label\n                  __typename\n                }\n                __typename\n              }\n              ... on CustomTemplate {\n                operatingSystem {\n                  label\n                  __typename\n                }\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n          osPermissions(first: 100) {\n            nodes {\n              flag\n              operatingSystemLabel\n              __typename\n            }\n            __typename\n          }\n          regionAvailability(first: 10) {\n            nodes {\n              regionName\n              isAvailable\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
          operationName: "OperatingSystems",
          variables: {
            osFirst: 40,
            vmTypeFirst: 100,
          },
        },
        {
          headers: {
            authority: "api.paperspace.com",
            ...this.privateHeaders(),
          },
        },
      );

      return this.transformConfigurations(data);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      if (e instanceof Error) {
        // Passthrough string error
        throw new Error(e.message);
      }

      // Fail with undefined error
      throw new Error(`Error getting configurations.`);
    }
  }

  // Extract # of GPUs from machine name (e.g. P4000x2)
  private getNumberOfGpus(machineName: string): number {
    const numOfGpus = (machineName.match(/x(\d+)$/) || [])[1];
    return numOfGpus ? parseInt(numOfGpus) : 1;
  }

  /**
   * Transforms API data to ProviderServer
   * @param {any} data from API
   * @returns {ProviderServer} transformed data
   */
  private transformServer(data: any): ProviderServer {
    const gpuCount = this.getNumberOfGpus(data.machineType);
    return {
      id: data.id,
      ip: data.publicIpAddress,
      os: data.os,
      status: data.state,
      price: {
        hourly: -1, // missing
      },
      specs: {
        cores: data.cpus,
        // gpu ram
        ram: data.gpu in gpuMemory ? gpuCount * gpuMemory[data.gpu] : -1,
        gpu: {
          model: data.gpu,
          count: gpuCount,
        },
      },
    };
  }

  /**
   * Gets server details by id
   * @param id of the server
   * @returns {Promise<ProviderServer>} Server details
   * @throws {Error} if request fails
   */
  public async getServer(id: string): Promise<ProviderServer> {
    try {
      if (id === "") throw new Error("Missing server ID");

      // Collect single server
      const { data: publicData } = await this.client.get(
        `/machines/getMachinePublic?machineId=${id}`,
      );
      const serverData = this.transformServer(publicData);

      // Get internal Id
      const { data } = await this.client.get(
        `/machines/getMachines?machineId=${id}`,
      );
      const internalId = data.find((server: any) => server.id === id)
        ?.internalId;
      // Collect internal API data for pricing
      const { data: internalData } = await this.client.get(
        `/machines/getMachine?machineId=${internalId}`,
      );
      serverData.price.hourly = parseFloat(internalData.usageRate.rateHourly);
      serverData.price.monthly =
        parseFloat(internalData.usageRate.rateMonthly) +
        parseFloat(internalData.storageRate.rate);

      return serverData;
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      if (e instanceof Error) {
        // Passthrough string error
        throw new Error(e.message);
      }

      // Fail with undefined error
      throw new Error(`Error collecting server: ${id}`);
    }
  }

  /**
   * Gets all machines
   * @returns {Promise<ProviderServer[]>} list of machine objects
   * @throws {Error} if request fails
   */
  public async getAllServers(): Promise<ProviderServer[]> {
    try {
      // Collect server list
      const { data } = await this.client.get("/machines/getMachines");

      // Transform servers
      return data.map((serverData: any) => this.transformServer(serverData));
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      // Fail with undefined error
      throw new Error(`Error collecting all servers`);
    }
  }

  /**
   * Creates and registers new startup script
   * @param {object} params parameters for startup script
   * @returns {Promise<string | null>} script ID, if successful
   * @throws {Error} if script creation fails
   */
  private async createStartupScript(params: {
    machineType: string;
    numShard: number;
    runConfig: RunConfig;
  }): Promise<string> {
    try {
      // Create server
      const {
        data: { id },
      }: { data: { id: string } } = await this.client.post(
        "/scripts/createScript",
        {
          scriptName: `startup_script_${Date.now()}`,
          scriptText: formatScript(params),
          runOnce: false,
        },
      );

      // Return server id
      return id;
    } catch (e) {
      throw new Error("Error creating startup script.");
    }
  }

  /**
   * Creates new server
   * @param {ServerConfig} serverConfig Server configuration
   * @param {RunConfig} runConfig Run configuration
   * @returns {Promise<string>} server id
   * @throws {Error} if server creation fails
   */
  public async createServer(
    serverConfig: ServerConfig,
    runConfig: RunConfig,
  ): Promise<string> {
    const {
      instance: machineType,
      name: machineName,
      os: templateId,
      region,
      size,
    } = serverConfig;

    const scriptId = await this.createStartupScript({
      machineType,
      numShard: this.getNumberOfGpus(machineType),
      runConfig,
    });

    try {
      // Create server
      const {
        data: { id },
      }: { data: { id: string } } = await this.client.post(
        "/machines/createSingleMachinePublic",
        {
          machineType,
          region,
          machineName,
          templateId,
          size,
          scriptId,
          billingType: "hourly",
          assignPublicIp: true,
        },
      );

      // Return server id
      return id;
    } catch (e: any) {
      if (e.response.data.error.message) {
        throw new Error(e.response.data.error.message);
      }

      throw new Error(
        "Error creating server - Are you authorized to create this instance?",
      );
    }
  }

  /**
   * Starts server by id
   * @param id of the server
   * @returns {Promise<void>}
   * @throws {Error} if request fails
   */
  public async startServer(id: string): Promise<void> {
    try {
      // Start server
      await this.client.post(`/machines/${id}/start`);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      // Fail with undefined error
      throw new Error(`Error starting server ${id}`);
    }
  }

  /**
   * Stops server by id
   * @param id of the server
   * @returns {Promise<void>}
   * @throws {Error} if request fails
   */
  public async stopServer(id: string): Promise<void> {
    try {
      // Stop server
      await this.client.post(`/machines/${id}/stop`);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      // Fail with undefined error
      throw new Error(`Error stopping server ${id}`);
    }
  }

  /**
   * Deletes server by id
   * @param id of the server
   * @returns {Promise<void>}
   * @throws {Error} if request fails
   */
  public async deleteServer(id: string): Promise<void> {
    try {
      // Delete server
      await this.client.post(`/machines/${id}/destroyMachine`);
    } catch (e: unknown) {
      // If request failed
      if (axios.isAxiosError(e)) {
        // Passthrough error
        throw new Error(e?.response?.data?.message);
      }

      // Fail with undefined error
      throw new Error(`Error deleting server: ${id}`);
    }
  }
}
