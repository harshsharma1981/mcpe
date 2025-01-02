const { createServer } = require('bedrock-protocol');
const { Level } = require('level');
const path = require('path');
const Chunk = require('prismarine-chunk')('bedrock_1.20.30'); // Ensure this version matches your world

const worldPath = path.join(__dirname, './test2/db'); // Path to your world directory

async function loadBedrockWorld(worldPath) {
    try {
        const db = new Level(worldPath, { valueEncoding: 'binary' });
        const chunks = new Map();
        let loadedChunksCount = 0;

        for await (const [key, value] of db.iterator()) {
            if (isChunkKey(key)) {
                chunks.set(key, value);
                loadedChunksCount++;
            }
        }

        console.log(`Loaded ${loadedChunksCount} chunks from the world.`);
        return chunks;
    } catch (error) {
        console.error('Failed to load LevelDB database:', error);
        throw error;
    }
}

function isChunkKey(key) {
    return key.startsWith('chunk');
}

function generateChunkKey(x, z) {
    return `chunk_${x}_${z}`; // Ensure this matches your database's chunk key format
}

function getChunk(x, z, worldChunks) {
    const chunkKey = generateChunkKey(x, z);
    console.log(`Looking for chunk with key: ${chunkKey}`);
    const chunkData = worldChunks.get(chunkKey);

    if (!chunkData) {
        console.log(`Chunk (${x}, ${z}) not found.`);
        return null;
    }

    const chunk = new Chunk();
    try {
        chunk.load(chunkData);
    } catch (error) {
        console.error(`Error loading chunk (${x}, ${z}):`, error);
        return null;
    }

    if (!chunk.palette || chunk.palette.length === 0) {
        console.error(`Chunk (${x}, ${z}) has an empty palette.`);
        return null;
    }

    console.log(`Chunk (${x}, ${z}) successfully loaded.`);
    return chunk;
}

(async () => {
    try {
        const worldChunks = await loadBedrockWorld(worldPath);
const port = process.env.PORT || 19132; 
        const server = createServer({
            host: '0.0.0.0',
          port: port,// Ensure the port is free
            version: '1.21.51' // Match your Minecraft version
        });

        server.on('connect', (client) => {
            console.log(`New client connected: ${client.username}`);

            client.on('move_player', (packet) => {
                const xChunk = Math.floor(packet.x / 16);
                const zChunk = Math.floor(packet.z / 16);

                const chunk = getChunk(xChunk, zChunk, worldChunks);
                if (chunk) {
                    console.log(`Sending chunk (${xChunk}, ${zChunk}) to player ${client.username}.`);
                    client.write('chunk_data', {
                        chunk_x: xChunk,
                        chunk_z: zChunk,
                        data: chunk.dump(),
                        biomes: new Array(256).fill(1), // Example biomes array
                        block_entities: [] // Add block entities if needed
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

        console.log("MCPE Server with Bedrock world is running on port 19133...");

        // Clean up on shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            process.exit();
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
})();
