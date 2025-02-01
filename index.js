const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const initializeBaileys = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    client = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true,
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'close') {
            isClientConnected = false;
            console.log('Connection closed');
        } else if (connection === 'open') {
            isClientConnected = true;
            console.log('Baileys Client is ready to use!');

            // Send "hello" or "hai" message to a recipient
            const recipient = '1234567890@s.whatsapp.net'; // Replace with the recipient's phone number
            const message = Math.random() < 0.5 ? 'hello' : 'hai';
            await client.sendMessage(recipient, { text: message });
            console.log(`Message sent: ${message}`);

        
        }
    });

    client.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (message.key.fromMe) return; // Ignore bot's own messages
    
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const sender = message.key.remoteJid;
        
        console.log("Received Text:", text);
    
        // Check if the message is a 5-digit number (train number)
        if (/^\d{5}$/.test(text)) {
            try {
                const trainNumber = text;
                const response = await fetch(`https://live-train.vercel.app/${trainNumber}`);
                const data = await response.json();

                let ok = formatTrainResponse(data)
    
                await client.sendMessage(sender,{text:ok})
            } catch (error) {
                console.error('Error fetching train information:', error);
                await client.sendMessage(sender, { text: 'Failed to fetch train information.' });
            }
        }
    });
    
};


const formatTrainResponse = (data) => {
    if (!data || data.length === 0) {
        return "🚆 No train information found.";
    }

    const nextStop = data[0];
    const stationText = nextStop.station || "";

    // Check if it's an "Arriving at" or "Next Stop" message
    const isArriving = stationText.toLowerCase().includes("arriving");
    const isNextStop = stationText.toLowerCase().includes("next stop");

    if (!isArriving && !isNextStop) {
        return "🚆 Train not running today.";
    }

    // Extract Station Name (Remove 'Arriving at' or 'Next Stop' if present)
    const stationName = stationText
        .replace(/(Arriving at|Next Stop)/i, '') // Remove 'Arriving at' or 'Next Stop'
        .replace(/Delay.*/, '') // Remove 'Delay' and anything after
        .trim();

    return `🚉 *${isArriving ? "Arriving at" : "Next Stop"}:* ${stationName.includes("at")?stationName.split(" ")[0]: stationName } 🏁

🛤 *Platform:* ${nextStop.platform}

↗️ *Distance:* ${stationName.includes("at")? stationName.split(" ")[2]:0 }

⏳ *Delay:* ${nextStop.delay}

🕰 *Arrival:* ${nextStop.arrivalTime || 'N/A'}

🚦 *Departure:* ${nextStop.departureTime || 'N/A'}`;
};




initializeBaileys();