const { processFilename } = require('./index.js');

const testCases = [
    {
        input: "Lucky Star - Episode 03 - Various People.mkv",
        expectedTitle: "Lucky Star",
        expectedState: "[1x3]"
    },
    {
        input: "[Reaktor] Fullmetal Alchemist Brotherhood - E04 v2 [1080p][x265][10-bit][Dual-Audio].mkv",
        expectedTitle: "Fullmetal Alchemist Brotherhood",
        expectedState: "[1x4]"
    },
    {
        input: "The.Mandalorian.S01E01.Chapter.One.1080p.WEB-DL.x264.mkv",
        expectedTitle: "The Mandalorian",
        expectedState: "[1x1]"
    },
    {
        input: "Attack.on.Titan.S04E12.720p.h264.mp4",
        expectedTitle: "Attack on Titan",
        expectedState: "[4x12]"
    },
    {
        input: "Mushoku Tensei S02E15 [1080p].mkv",
        expectedTitle: "Mushoku Tensei",
        expectedState: "[2x15]"
    }
];

console.log("--- Starting Advanced Sanitization Tests ---");

testCases.forEach((tc, index) => {
    const result = processFilename(tc.input);
    const titleMatch = result.title.trim().toLowerCase() === tc.expectedTitle.toLowerCase();
    const stateMatch = result.state === tc.expectedState;

    console.log(`\nTest #${index + 1}:`);
    console.log(`Input:    ${tc.input}`);
    console.log(`Result:   Title: "${result.title}", State: "${result.state}"`);
    console.log(`Expected: Title: "${tc.expectedTitle}", State: "${tc.expectedState}"`);
    
    if (titleMatch && stateMatch) {
        console.log("Verdict:  PASS ✅");
    } else {
        console.log("Verdict:  FAIL ❌");
        if (!titleMatch) console.log("  -> Title Mismatch");
        if (!stateMatch) console.log("  -> State Mismatch");
    }
});

console.log("\n--- Tests Completed ---");