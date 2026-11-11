import OpenAI from "openai";

// Single lazily-instantiated OpenAI client shared across controllers.
let client = null;

const getOpenAIClient = () => {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

export default getOpenAIClient;