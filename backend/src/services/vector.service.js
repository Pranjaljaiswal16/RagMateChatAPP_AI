
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});


// Index k ander Vector store krte hai
const aichatgptIndex = pc.Index("ai-chatgpt-app");

// =====================================================
// CREATE MEMORY
// =====================================================

async function createMemory({
  vectors,
  metadata,
  messageId,
}) {
  // Validate vector
  if (
    !Array.isArray(vectors) ||
    vectors.length === 0 ||
    !vectors.every(
      (value) => typeof value === "number"
    )
  ) {
    throw new Error("Vector is empty or invalid");
  }

  // Validate message ID
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

  console.log("Pinecone record:", {
    id: record.id,
    vectorLength: record.values.length,
    metadata: record.metadata,
  });

  await aichatgptIndex.upsert({
    records: [record],
  });

  console.log("✅ Memory saved successfully!");
}

// =====================================================
// QUERY MEMORY
// =====================================================

async function queryMemory({
  queryVector,
  limit = 5,
  filter,
}) {
  if (
    !Array.isArray(queryVector) ||
    queryVector.length === 0
  ) {
    throw new Error("Query vector is invalid");
  }

  const queryOptions = {
    vector: queryVector,
    topK: limit,
    includeMetadata: true,
  };

  // Apply Pinecone metadata filter
  if (
    filter &&
    Object.keys(filter).length > 0
  ) {
    queryOptions.filter = filter;
  }

  const data =
    await aichatgptIndex.query(queryOptions);

  return data.matches;
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  createMemory,
  queryMemory,
};

