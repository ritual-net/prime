import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import axios from "axios";
import type { InferenceOption, RunOption } from "@type/ml/tgi";
import { publicModels } from "@type/ml/model";
import { RunConfig } from "@type/ml/server";

const EMPTY_VALUE = "none";

/**
 * Inference configuration options
 */
export const INFERENCE_OPTIONS: InferenceOption[] = [
  {
    name: "Max new tokens",
    min: 0,
    max: 512,
    default: 20,
    step: 1,
    key: "max_new_tokens",
    type: "integer",
    constraint: "Greater than 0, up to 512.",
    description: "The maximum number of tokens to generate.",
  },
  {
    name: "Repetition penalty",
    min: 1,
    default: 1,
    max: 20,
    step: 0.1,
    key: "repetition_penalty",
    type: "float",
    constraint: "Greater than 0",
    description: "Penalty for repeated tokens. 1.0 means no penalty.",
  },
  {
    name: "Temperature",
    default: 1,
    min: 0.01,
    max: 2,
    step: 0.01,
    key: "temperature",
    type: "float",
    constraint: "Greater than 0",
    description:
      "Controls the randomness of the generated text. A higher value makes the output more diverse and random. Default is 1.0.",
  },
  {
    name: "Top P",
    default: 0.8,
    min: 0.01,
    max: 0.99,
    step: 0.01,
    key: "top_p",
    type: "float",
    constraint: "Between 0 (exclusive) and 1 (exclusive)",
    description:
      "Nucleus sampling. Consider only tokens whose cumulative probability exceeds a threshold. It helps generate more coherent and contextually relevant responses.",
  },
];

/**
 * Run configuration options
 */
export const RUN_OPTIONS: RunOption[] = [
  {
    type: "other",
    name: "Model",
    key: "model_id",
    default: "",
    advanced: false,
    values: publicModels.map((model) => model.id),
    optional: false,
  },
  {
    type: "other",
    name: "Quantize",
    key: "quantize",
    default: EMPTY_VALUE,
    advanced: false,
    values: ["bitsandbytes", EMPTY_VALUE],
    optional: true,
  },
  {
    type: "continuous",
    name: "Max Input Length",
    key: "max_input_length",
    min: 24,
    default: 1024,
    max: 8192,
    step: 2,
    advanced: false,
    optional: true,
  },
  {
    type: "continuous",
    name: "Max Concurrent Requests",
    key: "max_concurrent_requests",
    min: 1,
    default: 128,
    max: 400,
    step: 1,
    advanced: true,
    optional: true,
  },
  {
    type: "continuous",
    name: "Max Total Tokens",
    key: "max_total_tokens",
    min: 24,
    default: 2048,
    max: 8192,
    step: 2,
    advanced: false,
    optional: true,
  },
  {
    type: "categorical",
    name: "DType",
    key: "dtype",
    default: EMPTY_VALUE,
    values: [EMPTY_VALUE, "float16", "bfloat16"],
    advanced: true,
    optional: true,
  },
  {
    type: "continuous",
    name: "Max Best of",
    key: "max_best_of",
    min: 1,
    default: 2,
    max: 12,
    step: 1,
    advanced: true,
    optional: true,
  },
  {
    type: "input",
    name: "Weights Cache Override",
    key: "weights_cache_override",
    default: "",
    advanced: true,
    optional: true,
  },
  {
    type: "continuous",
    name: "Max Stop Sequences",
    key: "max_stop_sequences",
    min: 1,
    default: 2,
    max: 100,
    step: 1,
    advanced: true,
    optional: true,
  },
];

/**
 * Gets health of TGI endpoint (if it is available and ready to service requests)
 * @param {string} ip ip of running TGI server
 * @returns {Promise<boolean>} true if ready, else false
 */
export const getHealth = async (ip: string): Promise<boolean> => {
  try {
    await axios.post(`/api/tgi/health?ip=${ip}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Creates new SSE stream with TGI endpoint
 * @param {string} ip ip of running TGI server
 * @param {string} prompt to perform inference on
 * @param {Record<string, number>} options configurable options
 * @param {(msg: { token: { text: string } }) => void} callback action to pass each streamed event to
 * @param {AbortSignal} signal abort handler
 * @returns {Promise<void>} resolves when stream is completed
 */
export const processInference = async (
  ip: string,
  prompt: string,
  options: Record<string, number>,
  callback: (msg: { token: { text: string } }) => void,
  signal: AbortSignal,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    fetchEventSource(`/api/tgi/generate_stream`, {
      signal,
      // POST TGI API
      method: "POST",
      headers: {
        // Force JSON parsing
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ip,
        prompt,
        // Inject options
        parameters: options,
      }),
      async onopen(response: Response) {
        // Throw if error opening stream
        if (!response.ok)
          return reject(new Error("Errored opening SSE stream"));
      },
      async onmessage(msg: EventSourceMessage) {
        // Parse JSON message
        const json = JSON.parse(msg.data);
        // If error in message, throw new Error
        if ("error" in json) {
          return reject(new Error(json.error));
        }

        // Else, process received data
        callback(json);
      },
      onclose() {
        resolve();
      },
    });
  });
};

/**
 * Check that all run config parameters are valid according to RUN_OPTIONS and TGI semantics
 * @param {RunConfig} runConfig Run configuration
 * @throws {Error} With specific error message if any parameter settings are invalid
 */
export const validateRunConfig = (runConfig: RunConfig) => {
  for (const option of RUN_OPTIONS) {
    // Missing required option
    if (!option.optional && !(option.key in runConfig))
      throw new Error(`Missing required parameter ${option.key}.`);

    // Sanity checks
    switch (option.type) {
      case "categorical":
        if (!option.values.includes(runConfig[option.key] as string)) {
          throw new Error(
            `${runConfig[option.key]} is not a valid ${option.key} value.`,
          );
        }
        break;
      case "continuous":
        if (
          (runConfig[option.key] as number) > option.max ||
          (runConfig[option.key] as number) < option.min
        ) {
          throw new Error(
            `${option.key} is out of range (${option.min} - ${option.max}).`,
          );
        }
        break;
    }
  }

  // Check model id is provided
  if (!runConfig.model_id) throw new Error("No model_id provided.");

  // DType and quantize are mutually exclusive
  if (runConfig.dtype !== EMPTY_VALUE && runConfig.quantize !== EMPTY_VALUE)
    throw new Error("Dtype cannot be used on quantized models.");

  // Input token limit must be lower than total limit
  if (runConfig.max_input_length >= runConfig.max_total_tokens)
    throw new Error("Max total tokens must be greater than max input length.");

  // Future todos: 1. Max input length should depend on model limit; 2. Max total tokens should depend on available RAM
};

/**
 * Formats string with run config options as flags
 * @param {RunConfig} runConfig Run configuration
 * @returns {string} run config flags
 */
export const formatRunConfigFlags = (runConfig: RunConfig): string => {
  let flags = "";
  for (const option of RUN_OPTIONS) {
    // Skip optional flags if empty or EMPTY_VALUE
    if (option.optional) {
      flags +=
        runConfig[option.key] && runConfig[option.key] !== EMPTY_VALUE
          ? `--${option.key.replaceAll("_", "-")} ${runConfig[option.key]} `
          : "";
      continue;
    }

    // All other flags are required
    flags += `--${option.key.replaceAll("_", "-")} ${runConfig[option.key]} `;
  }

  return flags;
};

/**
 * Returns tgi launch script with environment variables plugged in
 * @param {string} scriptText startup script template
 * @param {object} params parameters for script
 * @returns {Promise<string | null>} script ID, if successful
 * @throws If any required environment variables are missing
 */
export function formatScript(params: {
  machineType: string;
  numShard: number;
  runConfig: RunConfig;
}): string {
  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASS,
    DB_NAME,
    DOCKERHUB_USER,
    DOCKERHUB_TGI_IMAGE_TAG,
    HF_API_KEY,
  } = process.env;

  if (
    !DB_HOST ||
    !DB_PORT ||
    !DB_USER ||
    !DB_PASS ||
    !DB_NAME ||
    !DOCKERHUB_USER ||
    !DOCKERHUB_TGI_IMAGE_TAG
  ) {
    throw new Error("Required env variables missing for startup script.");
  }

  const NUM_SHARD = params.numShard.toString();
  const RUN_FLAGS = formatRunConfigFlags(params.runConfig);
  const HF_API_FLAG = HF_API_KEY
    ? `-e HUGGING_FACE_HUB_TOKEN=${HF_API_KEY}`
    : "";

  const IMAGE_NAME = `${DOCKERHUB_USER}/${DOCKERHUB_TGI_IMAGE_TAG}`;

  return ` yes | (sudo apt update);
# For non-MLiaB-os
sudo docker --version &> /dev/null && echo "Docker is installed" || ( sudo curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh )

# Pull image from Dockerhub on first boot
if sudo docker image inspect ${IMAGE_NAME} &> /dev/null; then echo "Docker image ${IMAGE_NAME} exists."; else (sudo docker pull ${IMAGE_NAME}) > build_log.txt 2>&1; fi

# Start existing docker container, or run image
CONTAINER_ID=$(sudo docker ps -a -q --filter "ancestor=${IMAGE_NAME}" --latest)
if [ -z "$CONTAINER_ID" ]; then sudo docker run --gpus all --shm-size 1g -p 8080:80 -v /data:/data -e CLUSTER_ID=$(hostname) -e DB_URL=${DB_HOST} -e DB_PORT=${DB_PORT} -e DB_USER=${DB_USER} -e DB_PASS=${DB_PASS} -e DB_NAME=${DB_NAME} ${HF_API_FLAG} ${IMAGE_NAME} --num-shard ${NUM_SHARD} ${RUN_FLAGS}; else sudo docker start $CONTAINER_ID; fi`;
}
