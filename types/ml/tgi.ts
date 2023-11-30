// TGI completion API options
export type InferenceOption = {
  // Rendered option name
  name: string;
  // Minimum value
  min: number;
  // Maximum value
  max: number;
  // Default value
  default: number;
  // Value step increment
  step: number;
  // Option API key
  key: string;
  // type of input
  type: string;
  // value constraint imposed by tgi
  constraint: string;
  // description of option
  description: string;
};

// TGI server options
export type RunOption =
  | CategoricalOption
  | ContinuousOption
  | InputOption
  | OtherOption;

type InputOption = {
  type: "input";
  key: string;
  name: string;
  default: string;
  advanced: boolean;
  optional: boolean;
};

type CategoricalOption = {
  type: "categorical";
  key: string;
  name: string;
  default: string;
  values: string[];
  advanced: boolean;
  optional: boolean;
};

type ContinuousOption = {
  type: "continuous";
  key: string;
  name: string;
  default: number;
  min: number;
  max: number;
  step: number;
  advanced: boolean;
  optional: boolean;
};

type OtherOption = {
  type: "other";
  key: string;
  name: string;
  default: string;
  values: string[];
  advanced: boolean;
  optional: boolean;
};
