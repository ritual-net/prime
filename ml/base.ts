import { ProviderType } from "@prisma/client";
import type { Configuration } from "@type/ml/configuration";
import type { ProviderServer, RunConfig, ServerConfig } from "@type/ml/server";

/**
 * Base ML inference provider
 */
export interface BaseProvider {
  /**
   * Helper utility to map provider to type
   */
  type(): ProviderType;
  /**
   * Checks if provided API details are valid
   * @returns {Promise<boolean>} true if valid, false otherwise
   */
  isAuth(): Promise<boolean>;
  /**
   * Gets list of available configurations
   * @returns {Promise<Configuration[]>} list of available configurations
   */
  getConfigurations(): Promise<Configuration[]>;
  /**
   * Collects details about a single server
   * @param {string} id server ID
   * @returns {Promise<ProviderServer>} server details
   */
  getServer(id: string): Promise<ProviderServer>;
  /**
   * Collects details about all servers
   * @returns {Promise<ProviderServer[]>} list of server details
   */
  getAllServers(): Promise<ProviderServer[]>;
  /**
   * Creates a new server
   * @param {ServerConfig} serverConfig server configuration
   * @param {RunConfig } runConfig run configuration
   * @returns {Promise<string>} newly-created server ID
   */
  createServer(
    serverConfig: ServerConfig,
    runConfig: RunConfig,
  ): Promise<string>;
  /**
   * Start server
   * @param {string} id server ID
   */
  startServer(id: string): Promise<void>;
  /**
   * Stop server
   * @param {string} id server ID
   */
  stopServer(id: string): Promise<void>;
  /**
   * Delete server
   * @param {string} id server ID
   */
  deleteServer(id: string): Promise<void>;
}
