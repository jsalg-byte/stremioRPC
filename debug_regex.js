const rawName = "[Anime Time] K-On! - 10.mkv";

function sanitizeForSearch(raw) {
    if (!raw) return "";
    let clean = raw;
    
    console.log(`[Step 0] Raw: "${clean}"`);

    // 1. Aggressive Bracket Removal
    clean = clean.replace(/\[.*?\]/g, "");
    console.log(`[Step 1] After []: "${clean}"`);

    clean = clean.replace(/\(.*?\)/g, "");
    clean = clean.replace(/\{.*?\}/g, "");
    
    // 2. Remove Junk
    clean = clean.replace(/\.mkv/gi, "");
    console.log(`[Step 2] After .mkv: "${clean}"`);

    // 3. Remove trailing numbers
    clean = clean.replace(/-\s*\d+$/, "");
    console.log(`[Step 3] After trailing: "${clean}"`);
    
    return clean.trim();
}

const result = sanitizeForSearch(rawName);
console.log(`[Final] "${result}"`);
