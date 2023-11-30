self.onmessage = async (
  event: MessageEvent<{ ip: string; options: object; prompt: string }>,
) => {
  const { ip, options: parameters, prompt } = event.data;

  try {
    const response = await fetch("/api/tgi/generate_stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ip,
        prompt,
        parameters,
      }),
    });

    if (!response.ok) {
      throw new Error("Errored fetching data");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body reader not available");
    }

    let data = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Signal end to main thread
        self.postMessage({ meta: "done" });
        break;
      }

      // Decode and send text to main thread
      data += new TextDecoder().decode(value);
      if (data.endsWith("\n\n")) {
        const lines = data.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonData = line.substring("data:".length);
            const parsedData = JSON.parse(jsonData);
            self.postMessage({ data: parsedData.token.text });
          }
        }
        data = "";
      }
    }
  } catch (error) {
    // Handle errors
    console.error("Error in worker:", error);
    self.postMessage({ meta: "error", data: error });
  }
};

export {};
