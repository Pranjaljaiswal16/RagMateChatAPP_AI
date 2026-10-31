const { Pinecone } = require("@pinecone-database/pinecone");

if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is missing");
}

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const aichatgptIndex = pc.index("ai-chatgpt-app");

// CREATE MEMORY
async function createMemory({ vectors, metadata, messageId }) {
  if (
    !Array.isArray(vectors) ||
    vectors.length !== 768 ||
    !vectors.every((value) => typeof value === "number")
  ) {
    throw new Error("Vector is invalid or dimension is not 768");
  }

  if (!messageId) {
    throw new Error("Message ID is required");
  }

  const record = {
    id: messageId.toString(),
    values: vectors,
    metadata: {
      chat: metadata.chat.toString(),
      user: metadata.user.toString(),
      text: metadata.text,
      role: metadata.role,
    },
  };

  await aichatgptIndex.upsert({
    records: [record],
  });

  console.log("Memory saved successfully!");
}

// QUERY MEMORY
async function queryMemory({ queryVector, limit = 5, filter }) {
  if (
    !Array.isArray(queryVector) ||
    queryVector.length !== 768 ||
    !queryVector.every((value) => typeof value === "number")
  ) {
    throw new Error("Query vector is invalid");
  }

  const queryOptions = {
    vector: queryVector,
    topK: limit,
    includeMetadata: true,
  };

  if (filter && Object.keys(filter).length > 0) {
    queryOptions.filter = filter;
  }

  const data = await aichatgptIndex.query(queryOptions);

  return data.matches || [];
}

module.exports = {
  createMemory,
  queryMemory,
};
