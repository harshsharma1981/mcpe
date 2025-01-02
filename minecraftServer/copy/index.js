const { createServer } = require('bedrock-protocol');
const { Level } = require('level');
const path = require('path');
const Chunk = require('prismarine-chunk')('bedrock_1.20.30'); // Update this version based on your needs

// Load your Bedrock world using LevelDB
const worldPath = path.join(__dirname, './test2/db'); // Path to your world directory
// console.log(worldPath);
async function loadBedrockWorld(worldPath) {
  const db = new Level(worldPath, { valueEncoding: 'binary' });
  // console.log(db)
  const chunks = new Map();

  let loadedChunksCount = 0; // Track loaded chunks

  // Read world data using async iterator
  for await (const [key, value] of db.iterator()) {
    console.log('Key:', key); // Log the key to see its structure

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
console.log(key);
  return key.startsWith('chunk'); // Modify as needed based on your key structure
}

// Load and send chunks to players
function getChunk(x, z, worldChunks) {
  const chunkKey = generateChunkKey(x, z);
  const chunkData = worldChunks.get(chunkKey);
  
  if (!chunkData) {
    console.log(`Chunk (${x}, ${z}) not found.`);
    return null;
  }

  const chunk = new Chunk();
  
  try {
    chunk.load(chunkData);
    console.log(`Chunk (${x}, ${z}) successfully loaded.`);
  } catch (error) {
    console.error(`Error loading chunk (${x}, ${z}):`, error);
    return null;
  }
  
  return chunk;
}


function generateChunkKey(x, z) {
  return `chunk_${x}_${z}`; // Modify this if your keys are structured differently
}


(async () => {
  try {
    const worldChunks = await loadBedrockWorld(worldPath);
console.log(worldChunks);
    const server = createServer({
      host: '0.0.0.0',
      port: 19132, // Use a different port if necessary
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
