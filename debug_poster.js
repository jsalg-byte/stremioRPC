const axios = require('axios');

async function fetchPoster(title) {
    try {
        console.log(`[Poster] Pipeline searching for: "${title}"`);
        
        // Try Single Search first
        const singleUrl = `https://api.tvmaze.com/single-search/shows?q=${encodeURIComponent(title)}`;
        console.log(`[Poster] Querying Single Search: ${singleUrl}`);
        
        let response = await axios.get(singleUrl, { timeout: 5000 }).catch(e => {
            console.log(`[Poster] Single Search status: ${e.response ? e.response.status : e.message}`);
            return { data: null };
        });

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

const titles = ["Lucky Star", "Luck Star", "The Mandalorian", "Attack on Titan"];

async function run() {
    for (const t of titles) {
        await fetchPoster(t);
        console.log("-------------------");
    }
}

run();
