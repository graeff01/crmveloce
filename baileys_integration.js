const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const P = require('pino');

const app = express();
app.use(express.json());
app.use(cors());

let sock = null;
const logger = P({ level: 'silent' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger,
        auth: state,
        browser: ['CRM Veloce', 'Chrome', '10.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 QR CODE - Escaneie:\n');
            const qrcode = require('qrcode-terminal');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => connectToWhatsApp(), 3000);
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const message = m.messages[0];
            if (!message.message || message.key.fromMe || message.key.remoteJid.includes('@g.us')) return;

            const phone = message.key.remoteJid.replace('@s.whatsapp.net', '');
            const name = message.pushName || 'Lead';
            let content = message.message.conversation || message.message.extendedTextMessage?.text || '[Mensagem não suportada]';

            console.log(`📨 ${name} (${phone}): ${content}`);

            await axios.post('http://localhost:5000/api/webhook/message', {
                phone, content, name,
                messageId: message.key.id,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ Erro:', error.message);
        }
    });
}

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!sock) return res.status(503).json({ error: 'WhatsApp não conectado' });
    try {
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => {
    console.log('🚀 Baileys rodando porta 3001');
    connectToWhatsApp();
});