const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

// --- CONFIGURATION ---
// TEST A: Your Custom ID
const CLIENT_ID = '1462212189246062848';

// TEST B: Known Working ID (VS Code) - Uncomment to test
// const CLIENT_ID = '383226322785009666'; 

// --- LOCATE IPC SOCKET ---
function getIpcPath() {
    const temp = os.tmpdir();
    // Standard Discord IPC locations
    const paths = [
        process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'discord-ipc-0') : null,
        path.join(temp, 'discord-ipc-0'),
        path.join(temp, 'app.com.discordapp.Discord', 'discord-ipc-0'),
        '/var/folders/discord-ipc-0' // Sometimes here on macOS
    ].filter(Boolean);

    // Scan /var/folders recursively is too slow, rely on known env vars or common paths first.
    // On macOS, it's often in a random /var/folders/xx/yyyy/T/discord-ipc-0
    // So we check the generic TMPDIR environment variable.
    const envTmp = process.env.TMPDIR;
    if (envTmp) paths.push(path.join(envTmp, 'discord-ipc-0'));

    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log(`[Socket] Found at: ${p}`);
            return p;
        }
    }
    
    console.error('[Error] Could not locate discord-ipc-0 socket. Is Discord running?');
    process.exit(1);
}

// --- PACKET ENCODING ---
const OPCodes = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };

function encode(op, data) {
    const json = JSON.stringify(data);
    const len = Buffer.byteLength(json);
    const packet = Buffer.alloc(8 + len);
    
    packet.writeInt32LE(op, 0);   // OpCode
    packet.writeInt32LE(len, 4);  // Length
    packet.write(json, 8);        // Data
    
    return packet;
}

function decode(buffer) {
    if (buffer.length < 8) return null;
    const op = buffer.readInt32LE(0);
    const len = buffer.readInt32LE(4);
    const body = buffer.slice(8, 8 + len).toString();
    try {
        return { op, data: JSON.parse(body) };
    } catch (e) {
        return { op, data: body };
    }
}

// --- MAIN LOGIC ---

const socketPath = getIpcPath();
const socket = net.createConnection(socketPath);

console.log(`[Init] Connecting with ID: ${CLIENT_ID}`);

socket.on('connect', () => {
    console.log('[Socket] Connected!');

    // 1. HANDSHAKE
    const handshake = { v: 1, client_id: CLIENT_ID };
    console.log('[Send] Handshake:', JSON.stringify(handshake));
    socket.write(encode(OPCodes.HANDSHAKE, handshake));
});

socket.on('data', (buffer) => {
    const response = decode(buffer);
    console.log('[Recv] RAW:', response);

    if (!response) return;

    // Handle Ready Event
    if (response.data && response.data.evt === 'READY') {
        console.log(`[Ready] Authenticated as: ${response.data.data.user.username}#${response.data.data.user.discriminator}`);
        
        // 2. SET ACTIVITY
        const payload = {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
                activity: {
                    details: "Debugging Raw",
                    state: "Please Work",
                    instance: false
                }
            },
            nonce: String(Math.random())
        };

        console.log('[Send] Setting Activity:', JSON.stringify(payload, null, 2));
        socket.write(encode(OPCodes.FRAME, payload));
    }
    
    // Handle Errors
    if (response.data && response.data.evt === 'ERROR') {
        console.error('--- DISCORD API ERROR ---');
        console.error(JSON.stringify(response.data, null, 2));
        socket.end();
    }
});

socket.on('error', (err) => {
    console.error('[Socket Error]', err);
});

socket.on('close', () => {
    console.log('[Socket] Connection Closed');
});
