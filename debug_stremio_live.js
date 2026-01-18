const axios = require('axios');

const STREMIO_ENDPOINT = 'http://127.0.0.1:11470/stats.json';
const TIMEOUT_MS = 60000; // 60 seconds
const POLL_INTERVAL = 3000; // 3 seconds

console.log(`[Debug] Starting Stremio Live Capture (Auto-exit in ${TIMEOUT_MS / 1000}s)...`);

// Safety Timer
setTimeout(() => {
    console.log('[Debug] Finished capture. Exiting.');
    process.exit(0);
}, TIMEOUT_MS);

// Helper to highlight interesting keys
function highlightKeys(key, value, path = '') {
    const lowerKey = key.toLowerCase();
    const interesting = ['name', 'title', 'type', 'season', 'episode', 'id', 'imdb', 'meta', 'video', 'player', 'stream', 'infohash'];
    
    if (interesting.some(k => lowerKey.includes(k))) {
        // We found a candidate!
        // We don't log here to avoid spamming, but we mark it in the main traverser if needed.
        return true;
    }
    return false;
}

// Deep inspector
function inspect(obj, path = '') {
    if (path === '') console.log('--- PAYLOAD START ---');
    
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            const val = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            if (highlightKeys(key, val)) {
                // If it's a primitive or short string, log it
                if (typeof val !== 'object' || val === null) {
                    console.log(`[CANDIDATE] ${currentPath}:`, val);
                } else if (Array.isArray(val)) {
                     console.log(`[CANDIDATE] ${currentPath}: [Array Length: ${val.length}]`);
                } else {
                     console.log(`[CANDIDATE] ${currentPath}: {Object}`);
                }
            }

            if (typeof val === 'object' && val !== null) {
                // Don't go too deep into 'files' if it's huge, just summary
                if (key === 'files' && Array.isArray(val)) {
                     // Check active file specifically
                     val.forEach((f, i) => {
                         if (f.__cacheEvents) {
                             console.log(`[ACTIVE FILE] ${currentPath}[${i}]:`, f);
                         }
                     });
                } else {
                    inspect(val, currentPath);
                }
            }
        }
    }
    if (path === '') console.log('--- PAYLOAD END ---\n');
}

async function poll() {
    try {
        const response = await axios.get(`${STREMIO_ENDPOINT}?t=${Date.now()}`);
        const data = response.data;

        if (!data || Object.keys(data).length === 0) {
            console.log('[Debug] Stremio is idle/empty.');
        } else {
            // Log full structure for the user to see (using console.dir for depth)
            // console.dir(data, { depth: null, colors: true }); 
            // The user asked for console.dir, but I'll use my inspector to filter noise 
            // and then dump the whole thing once just in case.
            
            console.log(`[Timestamp] ${new Date().toISOString()}`);
            inspect(data);
            
            // Just for good measure, dump the first stream object's keys
            const hash = Object.keys(data)[0];
            if (hash) {
                console.log(`[Root Keys]`, Object.keys(data[hash]));
            }
        }
    } catch (err) {
        console.error(`[Error] Fetch failed: ${err.message}`);
    }
}

// Loop
poll();
setInterval(poll, POLL_INTERVAL);