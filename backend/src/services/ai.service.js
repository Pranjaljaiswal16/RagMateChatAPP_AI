const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// GENERATE AI RESPONSE
async function generateResponse({ systemPrompt, history }) {
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: history,
        config: {
          maxOutputTokens: 1024,
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: "low",
          },
        },
      });

      return response.text;
    } catch (error) {
      console.error(`AI Error Attempt ${attempt}:`, error.message);

      const status = Number(error.status || error.code);

      if (status === 503 && attempt <= maxRetries) {
        const delay = 1500 * 2 ** (attempt - 1);

        console.log(
          `Gemini busy. Retrying in ${delay / 1000} seconds...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

// GENERATE VECTOR
async function generateVector(content) {
  try {
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Content for embedding cannot be empty");
    }

    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: content,
      config: {
        outputDimensionality: 768,
      },
    });

    const vector = response.embeddings?.[0]?.values;

    if (!vector || vector.length === 0) {
      throw new Error("Gemini returned an empty embedding");
    }

    return vector;
  } catch (error) {
    console.error("Embedding Error:", error.message);
    throw error;
  }
}

module.exports = {
  generateResponse,
  generateVector,
};