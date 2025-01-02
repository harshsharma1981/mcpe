const { createServer } = require('bedrock-protocol');
const { Level } = require('level');
const path = require('path');
const Chunk = require('prismarine-chunk')('bedrock_1.20.30'); // Update this version based on your needs

// Load your Bedrock world using LevelDB
const worldPath = path.join(__dirname, './super-op-start'); // Path to your world directory

async function loadBedrockWorld(worldPath) {
  const db = new Level(worldPath, { valueEncoding: 'binary' });
  const chunks = new Map();

  let loadedChunksCount = 0; // Track loaded chunks

  // Read world data using async iterator
  for await (const [key, value] of db.iterator()) {
    if (isChunkKey(key)) { // Check if key belongs to a chunk
      chunks.set(key, value);
      loadedChunksCount++;
    }
  }

  console.log(`Loaded ${loadedChunksCount} chunks from the world.`);
  return chunks; // Return the loaded chunks for future use
}

// Utility function to check if a key belongs to a chunk
function isChunkKey(key) {
  return key.startsWith('chunk'); // Modify as needed based on your key structure
}

// Load and send chunks to players
function getChunk(x, z, worldChunks) {
  const chunkKey = generateChunkKey(x, z);
  console.log(`Fetching chunk with key: ${chunkKey}`); // Log chunk key

  const chunkData = worldChunks.get(chunkKey);
  
  if (!chunkData) {
    console.log(`Chunk (${x}, ${z}) not found.`);
    return null; // Return early if no chunk is found
  }

  const chunk = new Chunk();
  chunk.load(chunkData);
  
  console.log(`Chunk (${x}, ${z}) successfully loaded.`); // Confirm successful chunk load
  return chunk;
}

function generateChunkKey(x, z) {
  return `chunk_${x}_${z}`; // Modify based on your key structure
}

(async () => {
  try {
    const worldChunks = await loadBedrockWorld(worldPath);

    const server = createServer({
      host: '0.0.0.0',
      port: 19134, // Use a different port if necessary
      version: '1.21.30' // Update this to match your Minecraft version
    });

    server.on('connect', (client) => {
      console.log(`New client connected: ${client.username}`);

      client.on('move_player', (packet) => {
        const xChunk = Math.floor(packet.x / 16);
        const zChunk = Math.floor(packet.z / 16);

        const chunk = getChunk(xChunk, zChunk, worldChunks);
        if (chunk) {
          console.log(`Sending chunk (${xChunk}, ${zChunk}) to player ${client.username}.`);
          // Send the chunk data to the player
          client.write('chunk_data', {
            chunk_x: xChunk,
            chunk_z: zChunk,
            data: chunk.dump(), // Ensure this is correctly formatted
            biomes: [], // Optional: Provide biome data if needed
            block_entities: [] // Optional: Provide block entities if needed
          });
        } else {
          console.log(`Unable to send chunk (${xChunk}, ${zChunk}) to player ${client.username}.`);
        }
      });

      client.on('close', () => {
        console.log(`Client ${client.username} disconnected.`);
      });
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
    });
    
    console.log("MCPE Server with Bedrock world is running on port 19134...");
  } catch (error) {
    console.error('Error starting server:', error);
  }
})();
