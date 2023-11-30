// @ts-nocheck
import type {
  RedactWorkerInput,
  RedactWorkerOutput,
} from "@type/workers/redact";
import { expose } from "comlink";

// Web worker script imports
importScripts("https://cdn.jsdelivr.net/pyodide/v0.21.0/full/pyodide.js");

/**
 * NER package => js-installed deps + python-installed deps
 */
const PACKAGES: Record<
  string,
  { js: string[]; python: string[] | string[][] }
> = {
  nltk: {
    js: ["nltk"],
    python: [
      ["punkt.zip", "tokenizers", "/redact/packages/punkt.zip"],
      [
        "maxent_ne_chunker.zip",
        "chunkers",
        "/redact/packages/maxent_ne_chunker.zip",
      ],
      ["words.zip", "corpora", "/redact/packages/words.zip"],
      [
        "averaged_perceptron_tagger.zip",
        "taggers",
        "/redact/packages/averaged_perceptron_tagger.zip",
      ],
    ],
  },
  spacy: {
    js: ["numpy", "pydantic"],
    python: [
      "/redact/packages/spacy-3.4.0-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/en_core_web_sm-3.4.0-py3-none-any.whl",
      "/redact/packages/thinc-8.1.0-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/srsly-2.4.3-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/murmurhash-1.0.7-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/cymem-2.0.6-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/blis-0.7.8-cp310-cp310-emscripten_3_1_14_wasm32.whl",
      "/redact/packages/preshed-3.0.6-cp310-cp310-emscripten_3_1_14_wasm32.whl",
    ],
  },
};

/**
 * Redact Web Worker
 */
export const RedactWorker = {
  /**
   * Sets up pyodide and package dependencies
   */
  async setup(): Promise<void> {
    // Setup pyodide
    self.pyodide = await loadPyodide();

    // Install base packages
    await self.pyodide.loadPackage([
      "micropip",
      // Nltk dependencies we can install from Node
      ...PACKAGES.nltk.js,
      // Spacy dependencies we can install from Node
      ...PACKAGES.spacy.js,
    ]);

    // Nltk: Install dependencies we are forced to install from Python
    await self.pyodide.runPythonAsync(`
      from js import fetch
      from pathlib import Path
      import os, sys, io, zipfile

      paths = ${JSON.stringify(PACKAGES.nltk.python)}

      d = Path("/nltk_data")
      d.mkdir(parents=True, exist_ok=True)

      for path in paths:
        resp = await fetch(path[2])
        js_buffer = await resp.arrayBuffer()
        py_buffer = js_buffer.to_py()
        stream = py_buffer.tobytes()
        p = Path(f"/nltk_data/{path[0]}")
        p.write_bytes(stream)
        p = Path(f"/nltk_data/{path[1]}")
        p.parent.mkdir(parents=True, exist_ok=True)
        zipfile.ZipFile(f"/nltk_data/{path[0]}").extractall(path=f"/nltk_data/{path[1]}")
        print(f"Nltk loaded: {path[0]}")
    `);

    // Spacy: Install dependencies we are forced to install from Python
    await self.pyodide.runPythonAsync(`
      import micropip
      await micropip.install(${JSON.stringify(PACKAGES.spacy.python)})
      await micropip.install("faker")
    `);

    // Load pipeline module
    const pipelineZip = await (
      await fetch("/redact/pipeline.zip")
    ).arrayBuffer();
    self.pyodide.unpackArchive(pipelineZip, "zip");
    self.pyodide.pyimport("pipeline");

    // Toggle ready status
    self.ready = true;
  },
  /**
   * Process prompt redaction
   * @param {RedactWorkerInput} input params
   * @returns {Promise<RedactWorkerOutput>} returned from pyodide
   */
  async redact(input: RedactWorkerInput): Promise<RedactWorkerOutput> {
    // If not ready, throw error
    if (!self.ready) throw new Error("Not ready to process redaction");

    // Process Python
    const stringData: string = await self.pyodide.runPythonAsync(`
      from pipeline.detect import detect
      detect("${input.ner}", """${input.prompt}""", ${JSON.stringify(
        input.config,
      )})
    `);

    // Parse response as JSON
    return JSON.parse(stringData);
  },
};

// Wrap web worker as Comlink RPC proxy
expose(RedactWorker);
