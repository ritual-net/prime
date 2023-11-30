// Whitelist of public models to enable for deployment on Prime UI
export const publicModels = [
  {
    id: "timdettmers/guanaco-33b-merged",
    name: "Guanaco 33B merged",
    quantizeOptions: ["bitsandbytes"],
  },
  {
    id: "MetaIX/GPT4-X-Alpasta-30b",
    name: "GPT4-X Alpasta 30B",
    quantizeOptions: ["bitsandbytes"],
  },
  {
    id: "CalderaAI/30B-Lazarus",
    name: "Lazarus 30B",
    quantizeOptions: ["bitsandbytes", "none"],
  },
  {
    id: "huggyllama/llama-65b",
    name: "Llama 65B",
    quantizeOptions: ["bitsandbytes", "none"],
  },
  {
    id: "timdettmers/guanaco-65b-merged",
    name: "Guanaco 65B merged",
    quantizeOptions: ["bitsandbytes", "none"],
  },
  {
    id: "tiiuae/falcon-40b-instruct",
    name: "Falcon 40B Instruct",
    quantizeOptions: ["bitsandbytes", "none"],
  },
  {
    id: "meta-llama/Llama-2-7b-hf",
    name: "Llama 2 7B",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
  {
    id: "meta-llama/Llama-2-7b-chat-hf",
    name: "Llama 2 7B chat",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
  {
    id: "meta-llama/Llama-2-13b-hf",
    name: "Llama 2 13B",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
  {
    id: "meta-llama/Llama-2-13b-chat-hf",
    name: "Llama 2 13B chat",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
  {
    id: "meta-llama/Llama-2-70b-hf",
    name: "Llama 2 70B",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
  {
    id: "meta-llama/Llama-2-70b-chat-hf",
    name: "Llama 2 70B chat",
    quantizeOptions: ["bitsandbytes", "none"],
    private: true,
  },
];

export type SupportedModel = {
  // model ID
  id: string;
  // model name
  name: string;
  // quantization options
  quantizeOptions: string[];
  // size (over) estimate in bytes
  size: number;
  // private model
  private: boolean;
};
