const rpc = require('discord-rpc');

// Configuration
const CLIENT_ID = '1462212189246062848';
const client = new rpc.Client({ transport: 'ipc' });

console.log('--- RPC DIAGNOSTIC START ---');
console.log(`Connecting with Client ID: ${CLIENT_ID}`);

client.on('ready', () => {
    console.log(`Connected to Discord as: ${client.user.username}`);
    
    const activity = {
        details: "Debug Test",
        state: "Testing Connection",
        instance: false
    };

    console.log("Attempting to set activity...");
    console.log("Payload:", JSON.stringify(activity, null, 2));

    client.setActivity(activity)
        .then(() => {
            console.log("-----------------------------------------");
            console.log("SUCCESS: Discord accepted the payload.");
            console.log("CHECK YOUR DISCORD PROFILE NOW.");
            console.log("If you see 'Debug Test', the Client ID is fine.");
            console.log("If you see NOTHING, your Client Settings or ID are broken.");
            console.log("-----------------------------------------");
        })
        .catch((err) => {
            console.error("--- RPC REJECTION ---");
            console.error("Discord rejected the payload.");
            console.error("Error Code:", err.code);
            console.error("Message:", err.message);
            console.error("Full Error:", err);
            console.log("---------------------");
        });
});

client.login({ clientId: CLIENT_ID }).catch((err) => {
    console.error("--- CONNECTION FAILED ---");
    console.error("Could not connect to Discord Client.");
    console.error("Is Discord running?");
    console.error(err);
    process.exit(1);
});
