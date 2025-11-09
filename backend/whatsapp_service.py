import requests
from datetime import datetime

class WhatsAppService:
    def __init__(self, database, socketio):
        self.db = database
        self.socketio = socketio
        self.venom_url = "http://localhost:3001"
        self.is_ready = False

    # =============================
    # STATUS DE CONEXÃO
    # =============================
    def check_connection(self):
        """Verifica se VenomBot está conectado"""
        try:
            response = requests.get(f"{self.venom_url}/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.is_ready = data.get("connected", False)
                return data
            return {"connected": False}
        except Exception as e:
            print(f"❌ Erro ao verificar conexão com VenomBot: {e}")
            self.is_ready = False
            return {"connected": False}

    # =============================
    # RECEBER MENSAGEM DO LEAD
    # =============================
    async def on_message(self, message):
        """
        Callback chamado pelo VenomBot (via webhook)
        Quando um lead envia mensagem para o número da empresa
        """
        try:
            phone = message.get("from", "").replace("@c.us", "").replace("+", "").strip()
            content = message.get("body", "").strip()
            sender_name = message.get("notifyName", message.get("pushName", "Lead"))

            # Ignora mensagens enviadas pela própria empresa
            if message.get("fromMe"):
                return

            print(f"📨 Mensagem recebida de {sender_name} ({phone}): {content}")

            # Cria ou busca o lead no banco
            lead = self.db.create_or_get_lead(phone, sender_name)

            # Salva a mensagem recebida
            self.db.add_message(
                lead_id=lead["id"],
                sender_type="lead",
                sender_name=sender_name,
                content=content
            )

            # Adiciona log na timeline do lead
            self.db.add_lead_log(
                lead_id=lead["id"],
                action="mensagem_recebida",
                user_name=sender_name,
                details=content[:100]
            )

            # Emite atualização em tempo real pro front-end
            self.socketio.emit("new_message", {
                "lead_id": lead["id"],
                "phone": phone,
                "name": sender_name,
                "content": content,
                "timestamp": datetime.now().isoformat(),
                "sender_type": "lead"
            })

            print("✅ Mensagem recebida e registrada com sucesso")

        except Exception as e:
            print(f"❌ Erro ao processar mensagem recebida: {e}")

    # =============================
    # ENVIAR MENSAGEM PARA O LEAD
    # =============================
    def send_message(self, phone, content, vendedor_id=None):
        """Envia mensagem para o lead via VenomBot"""
        try:
            phone_clean = phone.replace("@c.us", "").replace("+", "").strip()
            print(f"📤 Enviando mensagem para {phone_clean}: {content}")

            # Envia mensagem ao VenomBot
            response = requests.post(
                f"{self.venom_url}/send",
                json={"phone": phone_clean, "message": content},
                timeout=10
            )

            if response.status_code != 200:
                print(f"❌ Erro ao enviar mensagem: {response.text}")
                return False

            # Busca o lead, cria se não existir
            lead = self.db.create_or_get_lead(phone_clean, "Lead Automático")

            # Busca nome do vendedor (caso tenha ID)
            vendedor_name = "Vendedor"
            if vendedor_id:
                users = self.db.get_all_users()
                user = next((u for u in users if u["id"] == vendedor_id), None)
                if user:
                    vendedor_name = user["name"]

            # Salva mensagem enviada
            self.db.add_message(
                lead_id=lead["id"],
                sender_type="vendedor",
                sender_name=vendedor_name,
                content=content
            )

            # Adiciona log de envio
            self.db.add_lead_log(
                lead_id=lead["id"],
                action="mensagem_enviada",
                user_name=vendedor_name,
                details=content[:100]
            )

            # Notifica o front em tempo real
            self.socketio.emit("message_sent", {
                "lead_id": lead["id"],
                "phone": phone_clean,
                "content": content,
                "timestamp": datetime.now().isoformat(),
                "sender_type": "vendedor",
                "sender_id": vendedor_id
            })

            print("✅ Mensagem enviada e salva com sucesso")
            return True

        except requests.exceptions.Timeout:
            print("❌ Timeout: VenomBot parece estar offline.")
            return False
        except Exception as e:
            print(f"❌ Erro ao enviar mensagem: {e}")
            return False

    # =============================
    # STATUS E DESCONECTAR
    # =============================
    def get_status(self):
        """Retorna status atual do VenomBot"""
        status = self.check_connection()
        return {
            "connected": status.get("connected", False),
            "phone": status.get("phone", "Não conectado"),
            "venom_url": self.venom_url
        }

    def disconnect(self):
        """Força desconexão manual do VenomBot"""
        try:
            response = requests.post(f"{self.venom_url}/disconnect")
            if response.status_code == 200:
                print("🔌 Desconectado do WhatsApp com sucesso")
                return {"success": True}
            return {"success": False, "error": response.text}
        except Exception as e:
            print(f"❌ Erro ao desconectar: {e}")
            return {"success": False, "error": str(e)}


# =============================
# SIMULADOR DE MENSAGENS (DEV)
# =============================
class WhatsAppSimulator:
    """
    Simula mensagens recebidas — útil para testes sem o VenomBot real.
    """
    def __init__(self, whatsapp_service):
        self.service = whatsapp_service

    async def simulate_incoming_message(self, phone, content, name="Lead Teste"):
        """Simula o recebimento de uma mensagem de um lead"""
        message = {
            "from": f"{phone}@c.us",
            "body": content,
            "notifyName": name,
            "fromMe": False
        }
        await self.service.on_message(message)
