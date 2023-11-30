import {
  Activity,
  RefreshCw,
  RotateCw,
  ServerOff,
  Trash,
  Undo,
} from "lucide-react";
import {
  BLOCKED_PROMPT,
  NERDetector,
  type RedactConfig,
  type RedactWorkerOutput,
} from "@type/workers/redact";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@generated/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@generated/select";
import axios from "axios";
import Link from "next/link";
import { withAuth } from "@utils/auth";
import Layout from "@components/layout";
import { Input } from "@generated/input";
import { Label } from "@generated/label";
import { Button } from "@generated/button";
import { Slider } from "@generated/slider";
import { Switch } from "@generated/switch";
import { wrap, type Remote } from "comlink";
import { getServer } from "@api/servers/get";
import { RedactWorker } from "@workers/redact";
import { Textarea } from "@generated/textarea";
import { useToast } from "@generated/use-toast";
import { getWorkerConfig } from "@utils/redact";
import StatusIndicator from "@components/status";
import type { RedactOption } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { renderTimeSinceUpdate } from "@pages/server/[id]/index";
import { ServerStatus, type Server, RunningStatus } from "@type/ml/server";
import { INFERENCE_OPTIONS, getHealth } from "@utils/tgi";
import { checkHealth } from "@pages/api/tgi/health";

export default function Playground({
  server: defaultServer,
  health: defaultHealth,
}: {
  server: Server;
  health: boolean;
}) {
  const { data: session } = useSession();

  // Local state
  const [server, setServer] = useState<Server>(defaultServer);
  const [health, setHealth] = useState<boolean>(defaultHealth);
  const [lastHealthCheck, setLastHealthCheck] = useState<number>(
    +new Date() / 1000,
  );

  /**
   * Reloads server details from backend, saves to local state
   */
  const reloadServerDetails = useCallback(async () => {
    // Collect updated server details
    const {
      data: { server: updatedServer },
    }: { data: { server: Server } } = await axios.get(
      `/api/servers/get?id=${server.id}`,
    );

    // Ensure returned date is formatted as Date
    updatedServer.createdAt = new Date(updatedServer.createdAt);

    // Update local state
    setServer(updatedServer);
  }, [server.id]);

  /**
   * Reloads server health from TGI backend, saves to local state
   */
  const reloadTGIHealth = useCallback(async () => {
    setHealth(await getHealth(server.ip));
    setLastHealthCheck(+new Date() / 1000);
  }, [server.ip]);

  useEffect(() => {
    // Run every 30s
    const interval = setInterval(async () => {
      // Update server status
      await reloadServerDetails();
      // If server is running, clear interval
      if (RunningStatus.has(server.status)) clearInterval(interval);
    }, 30 * 1000);

    // Clear interval on dismount
    return () => clearInterval(interval);
  }, [server.status, reloadServerDetails]);

  useEffect(() => {
    // Run every 30s
    const interval = setInterval(async () => {
      // If server status is running (prerequisite)
      if (RunningStatus.has(server.status)) {
        // Update TGI health
        await reloadTGIHealth();
        // If TGI health is good, clear interval
        if (health) clearInterval(interval);
      }
    }, 30 * 1000);

    // Clear interval on dismount
    return () => clearInterval(interval);
  }, [health, server.status, reloadTGIHealth]);

  return (
    <Layout session={session}>
      {!RunningStatus.has(server.status) ? (
        // Server is not running
        <ServerNotRunning status={server.status} />
      ) : !health ? (
        // TGI is not ready
        <TGINotReady lastCheck={lastHealthCheck} />
      ) : (
        // Playground ready to process requests
        <ServerPlayground ip={server.ip} />
      )}
    </Layout>
  );
}

function ServerNotRunning({ status }: { status: ServerStatus }) {
  return (
    <div className="flex flex-col w-full m-5 border-2 border-dashed border-zinc-200 p-3 rounded-sm">
      <div className="flex flex-col m-auto text-center">
        <ServerOff className="mx-auto h-10 w-10" />
        <h1 className="my-2">Server not running</h1>
        <p className="max-w-[500px]">
          The playground is inaccessible because the server is not running.
        </p>
        <span className="flex self-center my-4 items-center border border-zinc-200 rounded-full py-1 px-2 font-light text-sm">
          <StatusIndicator
            status={status}
            displayText={true}
            className="mr-2"
          />
        </span>
      </div>
    </div>
  );
}

function TGINotReady({ lastCheck }: { lastCheck: number }) {
  // Time since TGI status last checked
  const [timeSince, setTimeSince] = useState<number>(
    +new Date() / 1000 - lastCheck,
  );

  // Update timeSince when prop is drilled down
  useEffect(() => {
    setTimeSince(+new Date() / 1000 - lastCheck);
  }, [lastCheck]);

  useEffect(() => {
    // Every second
    const interval = setInterval(
      // Increment time since last check by one second
      () => setTimeSince((previous) => previous + 1),
      1 * 1000,
    );

    // Clear interval on dismount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full m-5 border-2 border-dashed border-zinc-200 p-3 rounded-sm">
      <div className="flex flex-col m-auto text-center">
        <Activity className="mx-auto h-10 w-10" />
        <h1 className="my-2">Backend not ready</h1>
        <p className="max-w-[500px]">
          The inference backend is not ready to accept requests yet.
        </p>
        <span className="flex self-center my-4 items-center border border-zinc-200 rounded-full py-1 px-2 font-light text-sm">
          Last checked {renderTimeSinceUpdate(Number(timeSince.toFixed(0)))} ago
        </span>
      </div>
    </div>
  );
}

/**
 * Possible playground loading states
 */
enum LoadingState {
  // Not loading
  None,
  // Starting up worker processes
  Startup,
  // Processing redaction
  Redaction,
  // Processing inference
  Inference,
}

function ServerPlayground({ ip }: { ip: string }) {
  const { toast } = useToast();

  // Generate initial options from defaults
  const defaultOptions: Record<string, number> = INFERENCE_OPTIONS.reduce(
    // key => default mapping
    (obj, opt) => ({ ...obj, [opt.key]: opt.default }),
    {},
  );

  // Local state
  const [prompt, setPrompt] = useState<string>("");
  const [redact, setRedact] = useState<boolean>(false);
  const [redactedPrompt, setRedactedPrompt] = useState<string>("");
  const [detector, setDetector] = useState<NERDetector>(NERDetector.Spacy);
  const [redactedParams, setRedactedParams] = useState<{
    risk_score: number;
    entity_map: [string, string];
  } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Startup);
  const [options, setOptions] =
    useState<Record<string, number>>(defaultOptions);

  // Redaction
  const [redactWorker, setRedactWorker] = useState<Worker | null>(null);

  /**
   * Updates options with {key, value} pair
   * @param {string} key to update
   * @param {number} value to update at key
   */
  const updateOptions = useCallback((key: string, value: number) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      [key]: value,
    }));
  }, []);

  /**
   * Resets options to default
   */
  const resetOptionsDefault = useCallback(() => {
    setRedact(false);
    setOptions(defaultOptions);
    setDetector(NERDetector.Spacy);
  }, [defaultOptions]);

  /**
   * Collects redaction config in Python-format
   * @returns {Promise<RedactConfig>}
   */
  const collectConfig = useCallback(async (): Promise<RedactConfig> => {
    // Collect config
    const {
      data: { config },
    }: { data: { config: Record<string, RedactOption> } } = await axios.get(
      "/api/config/all",
    );

    // Return Python-format config
    return getWorkerConfig(config);
  }, []);

  /**
   * Generates text based on input prompt and configuration options
   * @param {string} prompt for completion
   */
  const generate = async (prompt: string) => {
    try {
      let final_prompt = prompt;
      let output: RedactWorkerOutput;
      if (redact) {
        // Toggle loading
        setLoading(LoadingState.Redaction);
        // Clear redacted prompt
        setRedactedPrompt("");
        // Clear redacted params
        setRedactedParams(null);

        // Setup redaction worker instance
        if (!redactWorker) throw new Error("Redact worker not loaded");
        const instance: Remote<typeof RedactWorker> = wrap(redactWorker);

        // Generate redacted prompt
        output = await instance.redact({
          ner: detector,
          prompt: prompt.replaceAll("\n", "\\n"),
          config: await collectConfig(),
        });

        // Check if new prompt is blocked
        if (output.new_prompt === BLOCKED_PROMPT) {
          throw new Error(
            "Playground inference is blocked due to redaction settings. Please make sure your prompt complies.",
          );
        }

        // Update redacted prompt
        setRedactedPrompt(output.new_prompt);
        // Update redacted params
        setRedactedParams({
          risk_score: output.risk_score,
          entity_map: output.entity_map,
        });

        final_prompt = output.new_prompt;
      }

      // Update loading state
      setLoading(LoadingState.Inference);

      // Append prompt to history
      setHistory((previous) => [...previous, prompt]);

      // Run generation in background worker
      const worker: Worker = new Worker(
        new URL("../../../workers/generate_stream.ts", import.meta.url),
      );

      // Initiate inference
      worker.postMessage({ ip, options, prompt: final_prompt });

      let newTokens: string[] = [];
      // Listen for stream
      worker.onmessage = (event) => {
        switch (event.data?.meta) {
          case "done":
            // Streamed response is done
            worker.terminate();

            // Batch process new tokens to append to real prompt
            if (redact) {
              let appendedString = newTokens.join("");
              for (const [entity, value] of Object.entries(output.redact_map)) {
                appendedString = appendedString.replaceAll(entity, value);
              }

              // Append to prompt
              setPrompt((previous) => previous + appendedString);
            }

            setLoading(LoadingState.None);
            break;

          case "error":
            // Error thrown in worker
            worker.terminate();
            setLoading(LoadingState.None);
            toast({
              variant: "destructive",
              title: `Inference error`,
              description: event.data.data,
            });
            break;

          default:
            // Update prompt in real-time
            if (redact) {
              setRedactedPrompt((previous) => previous + event.data.data);
            } else {
              setPrompt((previous) => previous + event.data.data);
            }
            // Append new tokens locally
            newTokens.push(event.data.data);
        }
      };

      // Cancel button should terminate worker
      const cancelButton = document.getElementById("cancel-button");
      cancelButton?.addEventListener("click", () => {
        if (worker) worker.terminate();
      });
    } catch (e) {
      // Log error
      console.error(e);
    }
  };

  /**
   * 1. Sets up redaction worker
   * 2. Stores worker in local state
   * 3. Calls setup() on worker, loading pyodide
   * 4. Updates ready state
   */
  useEffect(() => {
    // 1. Setup redaction worker
    const worker = new Worker(new URL("@workers/redact.ts", import.meta.url));

    // 2. Store worker in local state
    setRedactWorker(worker);

    // Create new redaction worker instance
    const instance: Remote<typeof RedactWorker> = wrap(worker);

    (async () => {
      // 3. Call setup() on worker
      await instance.setup();
      // 4. Update ready state
      setLoading(LoadingState.None);
    })();

    // Terminate web worker on dismount
    return () => worker.terminate();
  }, []);

  return (
    <div className="flex flex-col w-full">
      {/* Top stack */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Playground input */}
        <div className="flex flex-col flex-1 p-4 gap-4 border-r border-zinc-300">
          <Textarea
            value={prompt}
            className="flex-1 p-4 lg:resize-none"
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What makes up the S&P500 index?"
          />

          {redact && (
            <Textarea
              value={redactedPrompt}
              className="flex-1 p-4 lg:resize-none"
              placeholder="Redacted prompt"
              disabled
            />
          )}
        </div>

        {redactedParams && (
          // Redaction details
          <div className="flex flex-col h-full w-full lg:w-[300px] lg:border-r border-r-zinc-300">
            {/* Header */}
            <div className="p-4 border-t border-b lg:border-t-0 border-zinc-300">
              <h3 className="font-medium text-lg">Redaction</h3>
              <p className="text-sm font-light">PII &amp; sensitive data</p>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col">
              {/* Risk score */}
              <div className="flex justify-between px-4 py-2 text-sm font-light bg-black text-white">
                <span>Risk Score</span>
                <span className="font-bold">{redactedParams.risk_score}</span>
              </div>

              {/* Entity map */}
              <Table className="text-sm font-light [&_th]:h-9 [&_th]:px-4 [&_td]:px-4 [&_td]:py-2 lg:border-b">
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redactedParams.entity_map.map(([entity, value], i) => (
                    <TableRow key={i}>
                      <TableCell>{entity}</TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="flex flex-col h-full w-full lg:w-[300px] justify-between">
          {/* Playground settings */}
          <div>
            {/* Header */}
            <div className="p-4 border-t border-b lg:border-t-0 border-zinc-300">
              <h3 className="font-medium text-lg">Settings</h3>
              <p className="text-sm font-light">Configure generation options</p>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col justify-between p-4">
              {/* Slider configs */}
              <div className="flex flex-col gap-10">
                {INFERENCE_OPTIONS.map((option, i) => (
                  // Render config options
                  <div key={i}>
                    {/* Name + value */}
                    <div className="flex flex-row items-center justify-between">
                      <Label htmlFor={option.key}>{option.name}</Label>
                      <Input
                        className="w-16 py-1 px-2 h-auto"
                        value={options[option.key] ?? option.default}
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
                        value={[options[option.key]]}
                        defaultValue={[option.default]}
                        onValueChange={(value) =>
                          updateOptions(option.key, value[0])
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Redaction settings */}
          <div>
            {/* Header */}
            <div className="p-4 border-t border-b lg:border-t-0 border-zinc-300">
              <h3 className="font-medium text-lg">Redaction</h3>
              <div className="text-sm font-light">
                <Link
                  className="font-semibold text-yellow-700"
                  href="/settings/redaction"
                >
                  Mask{" "}
                </Link>
                sensitive information
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-col gap-3 mb-7">
                <Label htmlFor="redaction"> Enable </Label>
                <Switch
                  checked={redact}
                  onCheckedChange={(checked) => {
                    setRedact(checked);
                    setRedactedPrompt("");
                    setRedactedParams(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Label htmlFor="redaction"> Engine </Label>
                <Select
                  value={detector}
                  onValueChange={(value: string) =>
                    setDetector(value as NERDetector)
                  }
                >
                  <SelectTrigger id="redaction">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[NERDetector.Nltk, NERDetector.Spacy]
                        // Reverse since Spacy is default choice
                        .reverse()
                        .map((option: NERDetector, i: number) => (
                          <SelectItem key={i} value={option}>
                            {option as String}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div>
            <div className="flex flex-col m-3">
              <Button onClick={resetOptionsDefault} variant="outline">
                Reset settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stack */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end p-3 gap-3 border-t border-zinc-300">
        {/* Prompt actions */}
        <div className="flex gap-3 w-full lg:w-auto [&>button]:flex-1">
          {/* Undo prompt */}
          <Button
            onClick={() => {
              // Set prompt as last from history
              const lastPrompt: string = history[history.length - 1];
              setPrompt(lastPrompt);
              // Remove from history (will be readded when generating)
              setHistory((prev) => [...prev.slice(0, -1)]);
            }}
            variant="outline"
            disabled={loading !== LoadingState.None || history.length === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>

          {/* Regenerate prompt */}
          <Button
            onClick={() => {
              // Set prompt as last from history
              const lastPrompt: string = history[history.length - 1];
              setPrompt(lastPrompt);
              // Remove from history (will be readded when generating)
              setHistory((prev) => [...prev.slice(0, -1)]);
              // Generate from new prompt (note: local state not accessible to function)
              generate(lastPrompt);
            }}
            variant="outline"
            disabled={loading != LoadingState.None || history.length === 0}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Clear prompt */}
          <Button
            onClick={() => {
              setPrompt("");
              setRedactedPrompt("");
              setRedactedParams(null);
            }}
            variant="outline"
            disabled={loading !== LoadingState.None || prompt === ""}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>

        {/* Process inference */}
        <Button
          onClick={() => generate(prompt)}
          disabled={loading !== LoadingState.None || prompt === ""}
        >
          {loading !== LoadingState.None && (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          )}
          {(() => {
            if (loading === LoadingState.Startup) return "Loading worker...";
            if (loading === LoadingState.Redaction) return "Redacting...";
            if (loading === LoadingState.Inference) return "Generating...";
            if (prompt === "") return "Enter prompt";
            else return "Generate";
          })()}
        </Button>

        {/* Allow cancelling inference midway */}
        <Button
          id="cancel-button"
          onClick={() => {
            setLoading(LoadingState.None);
          }}
          variant="destructive"
          disabled={loading !== LoadingState.Inference}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Similar to /server/[id]/index with added TGI health check
export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    // Collect server ID from URL
    let id: string | string[] | undefined = context.params?.id;

    try {
      // If no ID found, throw error (not caught, just to break control flow)
      if (!id) throw new Error();
      // If more than one ID found, use first
      if (Array.isArray(id)) id = id[0];

      // Collect session details
      const session = await getSession(context);
      // Collect server details by ID
      const server = await getServer(id);
      // Collect TGI status
      const health = await checkHealth(server.ip);

      // Return details
      return {
        props: {
          session,
          server,
          health,
        },
      };
    } catch {
      // In case of any errors, redirect to dashboard
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
  },
);
