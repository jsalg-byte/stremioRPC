const fs = require('fs');
const path = require('path');
const axios = require('axios');
const rpc = require('discord-rpc');
const nlp = require('compromise');
const stringSimilarity = require('string-similarity');
require('dotenv').config({ quiet: true });

// Configuration
const CONFIG = {
    clientId: process.env.CLIENT_ID || '1462212189246062848',
    stremioUrl: process.env.STREMIO_ENDPOINT || 'http://127.0.0.1:11470/stats.json',
    updateInterval: 15000,
    cacheFile: path.join(__dirname, 'cache.json'),
    similarityThreshold: 0.90,
    largeImageKey: 'stremio' // Default/Fallback asset key
};

const client = new rpc.Client({ transport: 'ipc' });
let currentActivity = null;

// --- Cache Management ---

function loadCache() {
    try {
        if (fs.existsSync(CONFIG.cacheFile)) {
            return JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
        }
    } catch (err) {
        console.error('Error loading cache:', err.message);
    }
    return {};
}

function saveCache(cache) {
    try {
        fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
    } catch (err) {
        console.error('Error saving cache:', err.message);
    }
}

function findInCache(filename, cache) {
    const keys = Object.keys(cache);
    if (keys.length === 0) return null;

    if (cache[filename]) {
        return cache[filename];
    }

    const matches = stringSimilarity.findBestMatch(filename, keys);
    const best = matches.bestMatch;

    if (best.rating >= CONFIG.similarityThreshold) {
        console.log(`[Cache] Fuzzy match (${(best.rating * 100).toFixed(1)}%) for: "${filename}"`);
        return cache[best.target];
    }

    return null;
}

// --- Poster Fetching ---

async function fetchPoster(title, state) {
    try {
        console.log(`[Poster] Pipeline searching for: "${title}"`);
        
        // Try Single Search first
        const singleUrl = `https://api.tvmaze.com/single-search/shows?q=${encodeURIComponent(title)}`;
        console.log(`[Poster] Querying Single Search: ${singleUrl}`);
        
        let response;
        try {
            response = await axios.get(singleUrl, { timeout: 5000 });
        } catch (e) {
            console.log(`[Poster] Single Search status: ${e.response ? e.response.status : e.message}`);
            response = { data: null };
        }

        if (response.data && response.data.image) {
            const url = response.data.image.original || response.data.image.medium;
            console.log(`[Poster] Found (Single Search): ${url}`);
            return url;
        }

        // Fallback: General Search
        const searchUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`;
        console.log(`[Poster] Querying General Search: ${searchUrl}`);
        
        response = await axios.get(searchUrl, { timeout: 5000 });

        if (response.data && response.data.length > 0) {
            const first = response.data[0].show;
            console.log(`[Poster] General Search top hit: "${first.name}"`);
            if (first.image) {
                const url = first.image.original || first.image.medium;
                console.log(`[Poster] Found (General Search): ${url}`);
                return url;
            } else {
                console.log(`[Poster] Top hit "${first.name}" has no image.`);
            }
        } else {
            console.log(`[Poster] General Search returned no results.`);
        }
    } catch (e) {
        console.log(`[Poster] API Error: ${e.message}`);
    }
    
    console.log(`[Poster] Final Result: No poster found for "${title}"`);
    return null;
}

// --- Sanitization Pipeline ---

function processFilename(filename) {
    console.log(`[Pipeline] Raw: "${filename}"`);

    let raw = filename.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm|iso|dat)$/i, '');
    raw = raw.replace(/[^\x20-\x7E]/g, '');
    let normalized = raw.replace(/[._]/g, ' ');

    const patterns = [
        /s(\d+)\s?e(\d+)/i,
        /\b(\d+)x(\d+)\b/i,
        /\b(?:episode|ep|e)\s*(\d+)\b/i,
        /\s-\s(\d{1,3})\b/i
    ];

    let season = null;
    let episode = null;
    let titlePart = normalized;

    for (const regex of patterns) {
        const match = normalized.match(regex);
        if (match) {
            if (regex.source.includes('s(\\d+)\\s?e(\\d+)')) {
                season = parseInt(match[1]);
                episode = parseInt(match[2]);
            } else if (regex.source.includes('(\\d+)x(\\d+)')) {
                season = parseInt(match[1]);
                episode = parseInt(match[2]);
            } else {
                episode = parseInt(match[1]);
            }
            titlePart = normalized.substring(0, match.index).trim();
            break;
        }
    }

    let clean = titlePart;
    clean = clean.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');
    clean = clean.replace(/\s+-\s+$/, '');

    const techPatterns = [
        /(\b|\d+)(1080p|720p|480p|2160p|4k|5k|8k)(\b|\d+)/gi,
        /\b(x264|x265|h264|h265|hevc|avc|divx|xvid|10bit|8bit|hdr|sdr)\b/gi,
        /\b(web-dl|webrip|bluray|bdrip|hdtv|dvdrip|cam|remux|proper|repack|hc|web|multi)\b/gi,
        /\b(aac|ac3|dts|truehd|flac|opus|mp3|dual-audio|multi-audio|multi-sub|dubbed|subbed)\b/gi,
        /\b(reaktor|eztv|yify|rarbg|psa|megavista|qxr|vostfr|ita|eng)\b/gi
    ];
    
    techPatterns.forEach(pattern => clean = clean.replace(pattern, ' '));
    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

    let doc = nlp(clean);
    doc.match('(v1|v2|v3|v4)').remove();
    let finalTitle = doc.text().trim();

    if (!finalTitle || finalTitle.length < 2) finalTitle = clean;

    let state = '[Movie]';
    if (episode) {
        state = season ? `[${season}x${episode}]` : `[1x${episode}]`;
    } else if (season) {
        state = `[S${season}]`;
    }

    console.log(`[Pipeline] Result: "${finalTitle}" ${state}`);
    return { title: finalTitle || 'Unknown', state };
}

// --- Main Loop ---

async function checkStremioAndSetActivity() {
    try {
        const response = await axios.get(CONFIG.stremioUrl, { timeout: 2000 });
        const data = response.data;

        let activeStream = null;
        for (const [hash, stream] of Object.entries(data)) {
            if (stream.files || stream.name) {
                activeStream = stream;
                break;
            }
        }

        if (!activeStream) {
            if (currentActivity) {
                console.log('[Status] Idle (Cleared)');
                client.clearActivity();
                currentActivity = null;
            }
            return;
        }

        let filename = activeStream.name || 'Unknown';
        if (activeStream.files) {
            const activeFile = activeStream.files.find(f => f.__cacheEvents) || 
                               activeStream.files.find(f => f.selected) ||
                               activeStream.files.sort((a, b) => b.length - a.length)[0];
            if (activeFile) filename = activeFile.name;
        }

        let details = null;
        let state = null;
        let poster = null;

        // 1. Try Stremio Meta
        if (activeStream.meta) {
            const meta = activeStream.meta;
            const name = meta.name || meta.seriesName;
            
            // Only use meta if it's not a raw filename
            if (name && !name.match(/\.(mkv|avi|mp4)$/i)) {
                // Remove [Reaktor] style tags if present in meta name
                const cleanName = name.replace(/^\[.*?\]\s*/, '');
                
                // Process to ensure clean title
                const metaResult = processFilename(cleanName);
                details = metaResult.title;
                
                // Prefer meta season/episode if available
                state = (meta.season && meta.episode) ? `[${meta.season}x${meta.episode}]` : metaResult.state;
                
                poster = meta.poster || meta.background;
            }
        }

        // 2. Cache / Pipeline
        if (!details) {
            const cache = loadCache();
            const cached = findInCache(filename, cache);

            if (cached) {
                details = cached.title;
                state = cached.state;
                poster = cached.poster;
            } else {
                const result = processFilename(filename);
                details = result.title;
                state = result.state;
                
                // Fetch Poster if not in cache
                poster = await fetchPoster(details, state);

                cache[filename] = { ...result, poster };
                saveCache(cache);
            }
        } 
        
        // 3. Poster Fill (Critical Fix)
        // If we have details (from Meta or Cache) but NO poster, go get one!
        if (details && !poster) {
            // Check cache by TITLE first (maybe we cached the show title before)
            const cache = loadCache();
            const cachedByTitle = cache[details]; 

            if (cachedByTitle && cachedByTitle.poster) {
                poster = cachedByTitle.poster;
            } else {
                // Truly fetch it
                poster = await fetchPoster(details, state);
                
                // Update cache so we don't spam API
                // We key by filename usually, but let's key by title for poster reuse
                // Actually, let's just update the filename entry if it exists, or create a title entry
                if (!cache[filename]) {
                    cache[filename] = { title: details, state, poster };
                } else {
                    cache[filename].poster = poster;
                }
                // Also save by title for future lookups
                cache[details] = { title: details, poster };
                
                saveCache(cache);
            }
        }

        const newActivity = {
            details: details,
            state: state,
            largeImageKey: poster || CONFIG.largeImageKey,
            largeImageText: 'Stremio',
            instance: true
        };

        if (
            !currentActivity ||
            currentActivity.details !== newActivity.details ||
            currentActivity.state !== newActivity.state ||
            currentActivity.largeImageKey !== newActivity.largeImageKey
        ) {
            console.log(`[Discord] Updating: "${newActivity.details}" - ${newActivity.state} (Poster: ${poster ? 'Yes' : 'No'})`);
            await client.setActivity(newActivity);
            currentActivity = newActivity;
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            if (currentActivity) {
                console.log('[Status] Stremio Offline');
                client.clearActivity();
                currentActivity = null;
            }
        } else {
            console.error('[Error]', error.message);
        }
    }
}

if (require.main === module) {
    client.on('ready', () => {
        console.log(`[Discord] Connected as ${client.user.username}`);
        checkStremioAndSetActivity();
        setInterval(checkStremioAndSetActivity, CONFIG.updateInterval);
    });
    client.login({ clientId: CONFIG.clientId }).catch(err => console.error('[Discord] Login Failed:', err.message));
}

module.exports = { processFilename };
