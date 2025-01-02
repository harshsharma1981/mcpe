const { createServer } = require('bedrock-protocol');
const { Level } = require('level');
const path = require('path');
const Chunk = require('prismarine-chunk')('bedrock_1.20.30'); // Make sure this version matches your world

const worldPath = path.join(__dirname, './test2/db'); // Path to your world directory

async function loadBedrockWorld(worldPath) {
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
}

function isChunkKey(key) {
    return key.startsWith('chunk');
}

function generateChunkKey(x, z) {
    return `chunk_${x}_${z}`;
}

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
    } catch (error) {
        console.error(`Error loading chunk (${x}, ${z}):`, error);
        return null;
    }

    // Check the chunk's palette
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
        const server = createServer({
            host: '192.168.0.6',
            port: 19132,
            version: '1.18.2' // Make sure this matches your client version
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
                        biomes: [], // You may need to populate this based on your world
                        block_entities: [] // Populate this if you have block entities
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

        console.log("MCPE Server with Bedrock world is running on port 19132...");
    } catch (error) {
        console.error('Error starting server:', error);
    }
})();
