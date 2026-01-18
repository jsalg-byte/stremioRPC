const index = require('./index.js'); // This will fail because index.js starts the client immediately. 
// I need to refactor index.js to export the function or I just copy the function for testing.
// Since I cannot easily export without changing the main file structure (which is fine, but copy-paste test is safer for the agent context), I will replicate the logic in the test file briefly or refactor index.js to be testable.

// Better approach: I will Read index.js, extract the processFilename function using a regex/tool, and run it. 
// Or I can just write a test file that duplicates the function logic for verification purposes to ensure *my implementation* is correct.

// Actually, I can just refactor index.js to export the function if I edit it again.
// But let's just write a test file with the same logic to demonstrate it works.
// Or, I can use the `replace` tool to add `module.exports = { processFilename };` to index.js and wrap the main execution in a check.

// Let's modify index.js to allow importing processFilename.
