import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@generated/card";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@generated/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@generated/table";
import Layout from "@components/layout";
import { useRouter } from "next/router";
import { RunOption } from "@type/ml/tgi";
import { Input } from "@generated/input";
import { Label } from "@generated/label";
import { RUN_OPTIONS } from "@utils/tgi";
import { Button } from "@generated/button";
import { useSession } from "next-auth/react";
import axios, { type AxiosError } from "axios";
import { Textarea } from "@generated/textarea";
import { SupportedModel } from "@type/ml/model";
import { useToast } from "@generated/use-toast";
import { FlagOff, RotateCw } from "lucide-react";
import { Separator } from "@generated/separator";
import { Slider } from "@components/generated/ui/slider";
import { useCallback, useEffect, useState } from "react";
import { withAuthOnlySessionReturned } from "@utils/auth";
import type { Configuration } from "@type/ml/configuration";
import { ProviderType, UserPermission } from "@prisma/client";

// Default server configuration
const DEFAULT_SERVER_CONFIG: Record<string, string | null> = {
  provider: null,
  gpu: null,
  instance: null,
  size: null,
  region: null,
  os: null,
};

// Default run configuration
const DEFAULT_RUN_CONFIG: Record<string, string | number> = RUN_OPTIONS.reduce(
  (acc, obj) => ({ ...acc, [obj.key]: obj.default }),
  {},
);

export default function Create() {
  // Routing, session
  const { push } = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  // State: plans
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [plans, setPlans] = useState<Record<
    ProviderType,
    Configuration[]
  > | null>(null);

  // State: models
  const [models, setModels] = useState<SupportedModel[] | null>(null);

  // State: Server configurations
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [serverConfig, setServerConfig] = useState<
    Record<string, string | null>
  >(DEFAULT_SERVER_CONFIG);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  // State: Run configurations
  const [runConfig, setRunConfig] =
    useState<Record<string, string | number>>(DEFAULT_RUN_CONFIG);

  /**
   * Fetches the available plans from the API
   */
  const getPlans = useCallback(async () => {
    try {
      // Collect plans
      const {
        data: { configurations },
      }: { data: { configurations: Record<string, Configuration[]> } } =
        await axios.get("/api/servers/configurations");

      // Set plans
      const numProviders: number = Object.keys(configurations).length;
      if (numProviders == 0) throw new Error();
      setPlans(numProviders > 0 ? configurations : null);
    } catch {}
  }, []);

  /**
   * Fetches the supported models from the API
   */
  const getModels = useCallback(async () => {
    try {
      // Collect models
      const {
        data: { models },
      }: { data: { models: SupportedModel[] } } = await axios.get(
        "/api/models/all",
      );

      // Set models
      setModels(models.length > 0 ? models : null);
    } catch {}
  }, []);

  /**
   * Creates new server
   */
  const createServer = useCallback(async () => {
    try {
      // Toggle loading
      setSubmitLoading(true);

      // Submit create request
      const {
        data: { id },
      } = await axios.post("/api/servers/create", {
        serverConfig: {
          name,
          description,
          ...serverConfig,
        },
        runConfig,
      });

      // If successful, toast success
      toast({
        title: "Server created",
        description: "Your server has been created.",
      });

      // Redirect to server page
      await push(`/server/${id}`);
    } catch (e) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: "Error creating server",
        description: err.response?.data.message ?? "An unknown error occurred.",
      });
    } finally {
      // Toggle loading
      setSubmitLoading(false);
    }
  }, [serverConfig, runConfig, description, name, push, toast]);

  /**
   * Update selected configuration details
   * @param {string} key to update
   * @param {string} value to set
   */
  function updateConfig(key: string, value: string) {
    let seen = false; // Toggle if key to modify has been seen
    let newConfig = serverConfig;

    for (const k of Object.keys(newConfig)) {
      // Remove all keys after the key to modify
      if (seen) newConfig[k] = null;

      // Update key
      if (k === key) {
        seen = true;
        newConfig[k] = value;
      }
    }

    // Update config
    setServerConfig({ ...newConfig });
  }

  // On page load
  useEffect(() => {
    async function run() {
      // Toggle loading
      setPlansLoading(true);

      // Collect plans and models
      await getPlans();
      await getModels();

      // Toggle loading
      setPlansLoading(false);
    }

    run();
  }, [getPlans, getModels]);

  /**
   * Updates options with {key, value} pair
   * @param {string} key to update
   * @param {number} value to update at key
   */
  const updateRunConfig = useCallback((key: string, value: number | string) => {
    setRunConfig((prevOptions) => ({
      ...prevOptions,
      [key]: value,
    }));
  }, []);

  /**
   * Determine whether machine has enough capacity for given model
   * @param {string} model_id ID of given model
   * @param {number} capacity capacity of machine in GB
   * @returns {boolean} true if capacity is sufficient
   */
  const hasSufficient = (model_id: string, capacity: number): boolean => {
    if (!model_id) return true;
    const model = models!.find((model) => model.id === model_id)!;
    return capacity > model.size;
  };

  return (
    <Layout session={session}>
      <div className="mx-auto max-w-[1000px] w-full mt-8 my-16 px-8">
        {/* Page header */}
        <div>
          <h1 className="font-medium">Create new server</h1>
          <p className="font-light">
            Easily deploy machine learning applications across cloud providers
            and configurations.
          </p>
        </div>

        <Separator className="my-4" />

        {/* Page cards */}
        <div className="grid gap-6">
          {/* Basic config */}
          <Card>
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
              <CardDescription>Configure name and description.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3">
                {/* Server name */}
                <div>
                  <Label htmlFor="name">Server name</Label>
                  <Input
                    type="text"
                    value={name}
                    placeholder="My Server (max. 30 characters)"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Server description */}
                <div>
                  <Label htmlFor="description">Server description</Label>
                  <Textarea
                    value={description}
                    placeholder="Some useful details to know about this server."
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server config */}
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>
                Configure ML provider, instance types, regions, and more.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {plansLoading && (
                // Loading state
                <div className="flex border-2 border-dashed border-zinc-200 py-8 px-3 rounded-sm">
                  <div className="m-auto text-center">
                    <RotateCw className="mx-auto h-10 w-10 mb-4 animate-spin" />
                    <span>Loading possible configurations...</span>
                  </div>
                </div>
              )}

              {!plansLoading && plans === null && (
                // No plans available
                <div className="flex border-2 border-dashed border-zinc-200 py-8 px-3 rounded-sm">
                  <div className="m-auto text-center">
                    <FlagOff className="mx-auto mb-4 h-10 w-10" />
                    <div className="max-w-[400px]">
                      <p>No server configurations found.</p>

                      {session?.user?.permission === UserPermission.ADMIN ? (
                        // Admin access
                        <div>
                          <p className="mb-4">
                            Are you sure at least one ML provider is connected?
                          </p>
                          <Button onClick={() => push("/settings/keys")}>
                            Connect Keys
                          </Button>
                        </div>
                      ) : (
                        // Non-admin
                        <p>
                          Contact your administrator to setup ML provider keys.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!plansLoading && plans && (
                // Render plans
                <div className="grid gap-3">
                  <ConfigSelect
                    name="ML Provider"
                    placeholder="Select ML provider"
                    options={Object.keys(plans)}
                    value={serverConfig.provider}
                    handler={(v: string) => updateConfig("provider", v)}
                  />

                  {serverConfig.provider && (
                    <ConfigSelect
                      name="Graphics card model"
                      placeholder="Select graphics card model"
                      options={[
                        ...new Set(
                          plans[serverConfig.provider as ProviderType].map(
                            (val) => val.gpu.model,
                          ),
                        ),
                      ]}
                      value={serverConfig.gpu}
                      handler={(v: string) => updateConfig("gpu", v)}
                    />
                  )}

                  {serverConfig.provider && serverConfig.gpu && (
                    <ConfigSelect
                      name="Instance type"
                      placeholder="Select instance type"
                      options={plans[serverConfig.provider as ProviderType]
                        .filter((val) => val.gpu.model == serverConfig.gpu)
                        .map((val) => val.id)}
                      value={serverConfig.instance}
                      handler={(v: string) => {
                        updateConfig("instance", v);
                        updateRunConfig("model_id", "");
                      }}
                    />
                  )}

                  {serverConfig.provider &&
                    serverConfig.gpu &&
                    serverConfig.instance && (
                      <ConfigSelect
                        name="Storage size (GB)"
                        placeholder="Select storage size"
                        options={plans[serverConfig.provider as ProviderType]
                          .filter((val) => val.id === serverConfig.instance)[0]
                          .specs.storageCost.map((val) => val.size.toString())}
                        value={serverConfig.size}
                        handler={(v: string) => {
                          updateConfig("size", v);
                          updateRunConfig("model_id", "");
                        }}
                      />
                    )}

                  {serverConfig.provider &&
                    serverConfig.gpu &&
                    serverConfig.instance &&
                    serverConfig.size && (
                      <ConfigSelect
                        name="Region"
                        placeholder="Select region"
                        renders={plans[serverConfig.provider as ProviderType]
                          .filter((val) => val.id === serverConfig.instance)[0]
                          .regions.map((val) => ({
                            id: val.id,
                            value: val.description,
                          }))}
                        options={plans[serverConfig.provider as ProviderType]
                          .filter((val) => val.id === serverConfig.instance)[0]
                          .regions.map((val) => val.id)}
                        value={serverConfig.region}
                        handler={(v: string) => updateConfig("region", v)}
                      />
                    )}

                  {serverConfig.provider &&
                    serverConfig.gpu &&
                    serverConfig.instance &&
                    serverConfig.size &&
                    serverConfig.region && (
                      <ConfigSelect
                        name="Operating system"
                        placeholder="Select operating system"
                        renders={plans[serverConfig.provider as ProviderType]
                          .filter((val) => val.id === serverConfig.instance)[0]
                          .os.map((os) => ({ value: os.label, id: os.id }))}
                        options={plans[serverConfig.provider as ProviderType]
                          .filter((val) => val.id === serverConfig.instance)[0]
                          .os.map((os) => os.id)}
                        value={serverConfig.os}
                        handler={(v: string) => updateConfig("os", v)}
                      />
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ML config */}
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>
                Configure model type, token limits, concurrenct requests, and
                more.
              </CardDescription>
            </CardHeader>

            {!serverConfig.os && (
              // Loading state
              <CardContent>
                <div className="flex border-2 border-dashed border-zinc-200 py-8 px-3 rounded-sm">
                  <div className="m-auto text-center text-sm font-light">
                    <span>Please specify server configuration.</span>
                  </div>
                </div>
              </CardContent>
            )}

            {serverConfig.os && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {/* First Column */}
                  <div className="grid gap-3">
                    {/* Model */}
                    <div>
                      <ConfigSelect
                        name="Model"
                        placeholder="Select instance type"
                        renders={models?.map((model) => ({
                          value:
                            (model.private ? "(private) " : "") + model.name,
                          id: model.id,
                        }))}
                        options={models?.map((val) => val.id) || []}
                        value={runConfig.model_id as string}
                        handler={(v: string) => {
                          const ram = plans![
                            serverConfig.provider as ProviderType
                          ].filter((val) => val.id === serverConfig.instance)[0]
                            ?.specs.ram;

                          // Ensure that instance has sufficient GPU RAM
                          if (!hasSufficient(v, ram)) {
                            toast({
                              variant: "destructive",
                              title: "Insufficient RAM",
                              description: `Instance ${serverConfig.instance} has insufficient RAM for this model.`,
                            });
                            updateRunConfig("model_id", "");

                            // Ensure that selected instance has sufficient storage
                          } else if (
                            !hasSufficient(v, parseFloat(serverConfig.size!))
                          ) {
                            toast({
                              variant: "destructive",
                              title: "Insufficient Storage",
                              description: `Instance ${serverConfig.instance} has insufficient storage for this model.`,
                            });
                            updateRunConfig("model_id", "");
                          } else {
                            updateRunConfig("model_id", v);
                            updateRunConfig(
                              "quantize",
                              models?.find((model) => model.id === v)
                                ?.quantizeOptions[0] as string,
                            );
                          }
                        }}
                      />
                    </div>

                    {/* Quantization */}
                    <ConfigSelect
                      name="Quantize"
                      placeholder="Quantize?"
                      options={
                        models?.find((model) => model.id === runConfig.model_id)
                          ?.quantizeOptions || []
                      }
                      value={runConfig.quantize as string}
                      handler={(v: string) => updateRunConfig("quantize", v)}
                      // Quantization is conditionally allowed based on specified model
                      disabled={!runConfig.model_id}
                    />
                  </div>

                  <div className="grid gap-4">
                    {/* Basic Run Options */}
                    {RUN_OPTIONS.filter((option) => !option.advanced).map(
                      (option) =>
                        TgiServerOption(option, runConfig, updateRunConfig),
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {serverConfig.os && runConfig.model_id && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>
                  <span className="text-red-400">
                    Do not modify unless you know what you are doing.
                  </span>
                </CardDescription>
              </CardHeader>

              {/* Advanced Run Options */}
              <CardContent>
                <div className="flex flex-col md:flex-row flex-wrap gap-x-6 gap-y-4 md:gap-y-3">
                  {RUN_OPTIONS.filter((option) => option.advanced).map(
                    (option, i) => (
                      <div key={i} className="min-w-[calc(50%-0.75rem)]">
                        {TgiServerOption(option, runConfig, updateRunConfig)}
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Server selected configuration */}
          {plans &&
            serverConfig.provider &&
            serverConfig.gpu &&
            serverConfig.instance &&
            serverConfig.size && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="[&_th]:px-6 [&_th]:h-12 [&_td]:px-6 [&_td]:py-3">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parameter</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Instance type */}
                        <TableRow>
                          <TableCell>Instance</TableCell>
                          <TableCell>{serverConfig.instance}</TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>GPU</TableCell>
                          <TableCell>
                            {
                              plans[
                                serverConfig.provider as ProviderType
                              ].filter(
                                (val) => val.id === serverConfig.instance,
                              )[0].gpu.count
                            }
                            x {serverConfig.gpu}
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>Specs</TableCell>
                          <TableCell>
                            {
                              plans[
                                serverConfig.provider as ProviderType
                              ].filter(
                                (val) => val.id === serverConfig.instance,
                              )[0].specs.cores
                            }{" "}
                            vCores,{" "}
                            {
                              plans[
                                serverConfig.provider as ProviderType
                              ].filter(
                                (val) => val.id === serverConfig.instance,
                              )[0].specs.ram
                            }
                            GB RAM, {parseInt(serverConfig.size)}
                            GB storage
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>Hourly price</TableCell>
                          <TableCell>
                            $
                            {plans[serverConfig.provider as ProviderType]
                              .filter(
                                (val) => val.id === serverConfig.instance,
                              )[0]
                              .price.hourly.toFixed(2)}
                            /hour per Machine + (approx.) $
                            {
                              plans[serverConfig.provider as ProviderType]
                                .filter(
                                  (val) => val.id === serverConfig.instance,
                                )[0]
                                .specs.storageCost.filter(
                                  (val) => val.size == serverConfig.size,
                                )[0].monthly
                            }
                            /month Storage
                          </TableCell>
                        </TableRow>

                        {runConfig.model_id && (
                          // Model type
                          <TableRow>
                            <TableCell>Model</TableCell>
                            <TableCell>
                              {models?.find(
                                (model) => model.id === runConfig.model_id,
                              )?.name ?? "Unknown model"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

          <Button
            onClick={createServer}
            disabled={
              !name ||
              plansLoading ||
              submitLoading ||
              !serverConfig.os ||
              !runConfig.model_id
            }
          >
            {submitLoading && (
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
            )}
            {!name
              ? "Enter a server name"
              : submitLoading
              ? "Creating server..."
              : !serverConfig.os || !runConfig.model_id
              ? "Missing configurations"
              : "Create server"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Configuration select dropdown
 * @returns select field
 */
function ConfigSelect({
  name,
  placeholder,
  options,
  renders,
  value,
  disabled,
  handler,
}: {
  name: string;
  placeholder: string;
  options: string[];
  renders?: { id: string; value: string }[];
  value: string | null;
  disabled?: boolean;
  handler: (v: string) => void;
}) {
  const elementId: string = name.split(" ").join("-");

  /**
   * Gets value to render or default value
   * @param {string} id to check
   * @returns {string} rendered
   */
  const getValueOrRenderValue = (id: string | null): string | undefined => {
    if (renders) {
      return renders.find((r) => r.id === id)?.value;
    }

    return id ?? undefined;
  };

  return (
    <div>
      {/* Title */}
      <Label htmlFor={elementId}>{name}</Label>

      {/* Selection */}
      <Select
        // Use id (rather than render value) if available
        value={value ?? undefined}
        onValueChange={(value: string) => handler(value)}
        disabled={disabled}
      >
        <SelectTrigger id={elementId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option: string, i: number) => (
              <SelectItem key={i} value={option}>
                {getValueOrRenderValue(option)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Renders TGI server option
 * @returns select field
 */
const TgiServerOption = (
  option: RunOption,
  config: Record<string, string | number>,
  updateConfig: (k: string, v: number | string) => void,
) => {
  switch (option.type) {
    case "continuous":
      return (
        <div key={option.key}>
          {/* Name + value */}
          <div className="flex flex-row items-center justify-between">
            <Label htmlFor={option.key}>{option.name}</Label>
            <Input
              className="w-16 py-1 px-2 h-auto"
              value={config[option.key]}
              disabled
            />
          </div>

          <div className="mt-3">
            {/* Configuration slider */}
            <Slider
              id={option.key}
              min={option.min}
              max={option.max}
              step={option.step}
              value={[config[option.key] as number]}
              defaultValue={[option.default]}
              onValueChange={(value) => updateConfig(option.key, value[0])}
            />
          </div>
        </div>
      );

    case "categorical": {
      return (
        <ConfigSelect
          key={option.key}
          name={option.name}
          placeholder={option.name}
          options={option.values}
          value={config[option.key] as string}
          handler={(v: string) => updateConfig(option.key, v)}
        />
      );
    }

    case "input": {
      return (
        <div key={option.key}>
          <Label htmlFor={option.key}>{option.name}</Label>
          <Input
            type="text"
            value={config[option.key] as string}
            placeholder={option.name}
            onChange={(e) => updateConfig(option.key, e.target.value)}
          />
        </div>
      );
    }
  }
};

export const getServerSideProps = withAuthOnlySessionReturned();
