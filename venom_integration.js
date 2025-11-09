const venom = require('venom-bot');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let venomClient = null;

// Inicializar VenomBot
venom
  .create({
    session: 'veloce-crm',
    multidevice: true,
    folderNameToken: 'tokens',
    headless: false, // false = mostra o navegador para escanear QR Code
    disableWelcome: true,
    logQR: true,
  })
  .then((client) => startVenom(client))
  .catch((erro) => {
    console.error('❌ Erro ao iniciar Venom:', erro);
  });

async function startVenom(client) {
  venomClient = client;
  console.log('✅ WhatsApp conectado via VenomBot!');
  console.log('📱 Número conectado:', await client.getHostDevice());

  // ===== RECEBER MENSAGENS =====
  client.onMessage(async (message) => {
    // Ignorar mensagens de grupo e mensagens enviadas por nós
    if (message.isGroupMsg === false && !message.fromMe) {
      
      const phone = message.from.replace('@c.us', '');
      const content = message.body || message.caption || '';
      const name = message.sender.pushname || message.sender.name || 'Lead';

      console.log(`📨 Nova mensagem de ${name} (${phone}): ${content}`);

      // Enviar mensagem para o backend Python processar
      try {
        await axios.post('http://localhost:5000/api/webhook/message', {
          phone: phone,
          content: content,
          name: name,
          messageId: message.id,
          timestamp: message.timestamp
        });
        console.log(`✅ Mensagem enviada para o CRM`);
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem para o backend:', error.message);
      }
    }
  });

  // Status de conexão
  client.onStateChange((state) => {
    console.log('📡 Estado da conexão:', state);
  });

  console.log('🎯 VenomBot aguardando mensagens...');
}

// ===== API PARA ENVIAR MENSAGENS =====

// Endpoint para enviar mensagem de texto
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!venomClient) {
    return res.status(503).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const phoneFormatted = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await venomClient.sendText(phoneFormatted, message);
    console.log(`✅ Mensagem enviada para ${phone}: ${message}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para verificar status da conexão
app.get('/status', async (req, res) => {
  if (!venomClient) {
    return res.json({ connected: false });
  }

  try {
    const isConnected = await venomClient.isConnected();
    const hostDevice = await venomClient.getHostDevice();
    res.json({ 
      connected: isConnected,
      phone: hostDevice?.id?.user || 'Desconhecido'
    });
  } catch (error) {
    res.json({ connected: false, error: error.message });
  }
});

// Endpoint para desconectar
app.post('/disconnect', async (req, res) => {
  if (venomClient) {
    await venomClient.close();
    venomClient = null;
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Já desconectado' });
  }
});

// Iniciar servidor
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Venom rodando em http://localhost:${PORT}`);
  console.log(`📡 Aguardando conexão do WhatsApp...`);
});

// Tratamento de erros
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️  Encerrando VenomBot...');
  if (venomClient) {
    await venomClient.close();
  }
  process.exit(0);
});
