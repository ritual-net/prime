import axios from "axios";
import { publicModels, SupportedModel } from "@type/ml/model";

// Base URL for the Hugging Face API
const BASE_URL = "https://huggingface.co/api";

/**
 * Returns an approximate overestimate of the model size in GB.
 * Used to estimate the required RAM and disk space for hosting the model
 * @param modelId model ID on Hugging Face
 * @param hfApiKey Hugging Face API key
 * @param addShardBuffer whether to add a redundancy buffer for the largest shard
 * @returns
 */
async function getModelGBytes(
  modelId: string,
  hfApiKey?: string,
  addShardBuffer = true,
): Promise<number> {
  try {
    const response = await axios.get(`${BASE_URL}/models/${modelId}`, {
      params: { blobs: true },
      headers: { Authorization: `Bearer ${hfApiKey}` },
    });
    const model_data = response.data;
    const model_sizes = model_data.siblings
      .filter((file: { rfilename: string }) => file.rfilename.endsWith(".bin"))
      .map((file: { size: number }) => file.size) as number[];

    // use size of largest file as buffer, based on https://pytorch.org/tutorials/beginner/saving_loading_models.html
    // assumptions: model files dominate size, and largest file is the size of the biggest shard
    const total =
      model_sizes.reduce((a, b) => a + b, 0) +
      (addShardBuffer ? Math.max(...model_sizes) : 0);
    return total / 1024 ** 3;
  } catch (error) {
    // Handle RepositoryNotFoundError and HFValidationError
    return 0;
  }
}

/**
 * Fetches and transforms all private models from the Hugging Face organization
 * into SupportedModel objects for use in the app
 * @param hfApiKey Hugging Face API key
 * @param orgName Hugging Face organization name
 * @returns
 */
async function getPrivateModels(
  hfApiKey: string,
  orgName: string,
): Promise<SupportedModel[]> {
  try {
    // Get a list of all models in the organization
    const response = await axios.get(`${BASE_URL}/models`, {
      params: { search: `${orgName}/` },
      headers: { Authorization: `Bearer ${hfApiKey}` },
    });

    if (response.status === 200) {
      // Extract the list of models from the response
      const models = response.data || [];
      const transformed = models.map((model: any) => {
        return {
          id: model.modelId,
          name: model.modelId,
          quantizeOptions: ["bitsandbytes", "none"],
          private: true,
        };
      });

      return transformed;
    } else {
      throw new Error("Failed to retrieve models from the organization.");
    }
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }
}

/**
 * Return all supported models, including private models if HF credentials are available.
 * @returns {Promise<SupportedModel[]>} array of SupportedModel objects
 */
export async function getModels(): Promise<SupportedModel[]> {
  const hfApiKey = process.env.HF_API_KEY;
  const hfOrgName = process.env.HF_ORG_NAME;

  // Public models
  let allModels = publicModels.slice();

  // Private models if HF credentials available
  if (hfApiKey && hfOrgName) {
    let privateModels = await getPrivateModels(hfApiKey, hfOrgName);
    allModels = allModels.concat(privateModels);
  }

  // Get the approximate size of each model
  const transformed = await Promise.all(
    allModels.map(async (model) => {
      const size = await getModelGBytes(model.id, hfApiKey);
      if (size > 0) return { ...model, size };
    }),
  );

  return transformed.filter((model): model is SupportedModel => !!model);
}
