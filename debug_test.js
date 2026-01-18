// Paste the regex logic from index.js here for testing
function cleanFilename(filename) {
    if (!filename) return "";
    let clean = filename;

    // 1. Remove group names and hash tags in brackets/parentheses
    clean = clean.replace(/\\\[.*?\\\\]/g, ' ');
    // Remove content inside parens () if it contains specific keywords
    clean = clean.replace(/\\(([^)]*(?:Audio|Source|Dub|Sub|x265|x264|1080|720|WEBRip|BluRay)[^)]*)\\)/gi, ' ');

    // 2. Remove file extensions
    clean = clean.replace(/\\.(mkv|mp4|avi|wmv|mov|flv|webm|m4v)$/i, '');

    // 3. Remove common technical terms
    const techTerms = [
        '1080p', '720p', '480p', '2160p', '4k', 
        'x264', 'x265', 'hevc', 'h264', 'h.264', 
        'web-dl', 'webrip', 'bluray', 'bdrip', 'dvdrip', 
        'hdr', '10bit', '10-bit', 'opus', 'aac', 'ac3', 'eac3', 'dts', 
        'dual-audio', 'multi-audio', 'repack', 'proper', 'v2', 'v3'
    ];
    const techRegex = new RegExp(`\\b(${techTerms.join('|')})\\b`, 'gi');
    clean = clean.replace(techRegex, ' ');

    // 4. Handle "Season X Episode Y" patterns
    clean = clean.replace(/S(\\d{1,2})E(\\d{1,2})/gi, '');
    clean = clean.replace(/\\b(\\d{1,2})x(\\d{1,2})\\b/gi, '');
    clean = clean.replace(/\\b(Ep|Episode)\\.?\\s*(\\d+)/gi, '');
    clean = clean.replace(/-\\\s+(\\d+)\\\s+/, '');

    // 5. Replace dots and underscores
    clean = clean.replace(/[._]/g, ' ');

    // 6. Final Trim
    clean = clean.replace(/\\s+/g, ' ').trim();
    clean = clean.replace(/-\\\s*$/, '');

    return clean.trim();
}

function extractSxE(filename) {
    let match = filename.match(/S(\\d{1,2})E(\\d{1,2})/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    match = filename.match(/\\b(\\d{1,2})x(\\d{1,2})\\b/);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    match = filename.match(/\\b(?:Ep|Episode)\\.?\\s*(\\d+)/i);
    if (match) return { season: 1, episode: parseInt(match[1]) };
    match = filename.match(/-\\\s+(\\d+)\\\s/);
    if (match) return { season: 1, episode: parseInt(match[1]) };
    return { season: null, episode: null };
}

const tests = [
    "[Reaktor] Fullmetal Alchemist Brotherhood - E04 v2 [1080p][x265][10-bit][Dual-Audio].mkv",
    "Lucky Star + OVA + OP (Dual Audio) [1080p BD x265 Opus v3]",
    "The.Mandalorian.S01E01.Chapter.One.1080p.WEB-DL.x264.mkv"
];

console.log("--- Regex Tests ---");
tests.forEach(t => {
    const c = cleanFilename(t);
    const s = extractSxE(t);
    console.log(`Original: ${t}`);
    console.log(`Cleaned:  "${c}"`);
    console.log(`SxE:      S${s.season} E${s.episode}`);
    console.log("---");
});
