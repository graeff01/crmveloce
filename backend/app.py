from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, join_room, leave_room
from flask_cors import CORS
from database import Database
from whatsapp_service import WhatsAppService, WhatsAppSimulator
import asyncio
from functools import wraps
import sqlite3

# =======================
# CONFIGURAÇÃO PRINCIPAL
# =======================
app = Flask(__name__)
app.config["SECRET_KEY"] = "sua-chave-secreta-aqui-mude-em-producao"
CORS(app, supports_credentials=True)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

db = Database()
whatsapp = WhatsAppService(db, socketio)
simulator = WhatsAppSimulator(whatsapp)

# =======================
# DECORATORS DE SEGURANÇA
# =======================
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Não autenticado"}), 401
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if "user_id" not in session:
                return jsonify({"error": "Não autenticado"}), 401
            if session.get("role") not in roles:
                return jsonify({"error": "Sem permissão"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# =======================
# ROTAS DE LOGIN / LOGOUT
# =======================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    user = db.authenticate_user(data.get("username"), data.get("password"))
    if not user:
        return jsonify({"error": "Credenciais inválidas"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["name"] = user["name"]
    session["role"] = user["role"]

    return jsonify({"success": True, "user": user})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({
        "id": session["user_id"],
        "username": session["username"],
        "name": session["name"],
        "role": session["role"]
    })


# =======================
# ROTAS DE USUÁRIOS
# =======================
@app.route("/api/users", methods=["GET"])
@role_required("admin", "gestor")
def get_users():
    return jsonify(db.get_all_users())


@app.route("/api/users", methods=["POST"])
@role_required("admin")
def create_user():
    data = request.json
    uid = db.create_user(data["username"], data["password"], data["name"], data["role"])
    return jsonify({"success": True, "user_id": uid})


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@role_required("admin")
def update_user(user_id):
    data = request.json
    db.update_user(user_id, data["name"], data["role"], data.get("active", 1))
    return jsonify({"success": True})


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def delete_user(user_id):
    db.delete_user(user_id)
    return jsonify({"success": True})


# =======================
# MÉTRICAS (Gestores)
# =======================
@app.route("/api/metrics", methods=["GET"])
@role_required("admin", "gestor")
def get_metrics():
    return jsonify(db.get_metrics_summary())


# =======================
# LEADS E ATENDIMENTO
# =======================
@app.route("/api/leads", methods=["GET"])
@login_required
def get_leads():
    role = session["role"]
    uid = session["user_id"]
    leads = db.get_all_leads() if role in ["admin", "gestor"] else db.get_leads_by_vendedor(uid)
    return jsonify(leads)


@app.route("/api/leads/queue", methods=["GET"])
@login_required
def get_leads_queue():
    return jsonify(db.get_leads_by_status("novo"))


@app.route("/api/leads/<int:lead_id>/assign", methods=["POST"])
@login_required
def assign_lead(lead_id):
    uid = session["user_id"]
    uname = session["name"]

    db.assign_lead(lead_id, uid)
    db.add_lead_log(lead_id, "lead_assumido", uname, f"{uname} assumiu o lead")

    socketio.emit("lead_assigned", {"lead_id": lead_id, "vendedor_id": uid, "vendedor_name": uname})
    return jsonify({"success": True})


@app.route("/api/leads/<int:lead_id>/status", methods=["PUT"])
@login_required
def update_lead_status(lead_id):
    data = request.json
    status = data.get("status")
    uname = session["name"]

    db.update_lead_status(lead_id, status)
    db.add_lead_log(lead_id, "status_alterado", uname, f"Lead movido para {status.upper()}")

    socketio.emit("lead_updated", {"lead_id": lead_id, "status": status})
    return jsonify({"success": True})


# =======================
# MENSAGENS DO LEAD
# =======================
@app.route("/api/leads/<int:lead_id>/messages", methods=["GET"])
@login_required
def get_messages(lead_id):
    try:
        return jsonify(db.get_messages_by_lead(lead_id))
    except Exception as e:
        print(f"❌ Erro ao carregar mensagens: {e}")
        return jsonify({"error": "Erro ao carregar mensagens"}), 500


@app.route("/api/leads/<int:lead_id>/messages", methods=["POST"])
@login_required
def send_message(lead_id):
    data = request.json
    content = data.get("content")
    uid = session["user_id"]
    uname = session["name"]

    lead = db.get_lead(lead_id)
    if not lead:
        return jsonify({"error": "Lead não encontrado"}), 404

    success = whatsapp.send_message(lead["phone"], content, uid)
    if success:
        db.add_lead_log(lead_id, "mensagem_enviada", uname, content[:80])
    return jsonify({"success": success})


# =======================
# TIMELINE / HISTÓRICO DO LEAD
# =======================
@app.route('/api/lead/<int:lead_id>/logs', methods=['GET'])
@login_required
def get_lead_logs(lead_id):
    """Retorna histórico do lead"""
    try:
        conn = sqlite3.connect('crm.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT action, details, user_name as user, timestamp
            FROM lead_logs
            WHERE lead_id = ?
            ORDER BY timestamp DESC
        ''', (lead_id,))
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'action': row['action'],
                'details': row['details'],
                'user': row['user'],
                'timestamp': row['timestamp']
            })
        
        conn.close()
        return jsonify(logs)
    except Exception as e:
        print(f"❌ Erro ao carregar logs: {e}")
        return jsonify([])


# =======================
# NOTAS INTERNAS
# =======================
@app.route("/api/leads/<int:lead_id>/notes", methods=["GET"])
@login_required
def get_notes(lead_id):
    return jsonify(db.get_internal_notes(lead_id))


@app.route("/api/leads/<int:lead_id>/notes", methods=["POST"])
@login_required
def add_note(lead_id):
    data = request.json
    note = data.get("note")
    uid = session["user_id"]
    uname = session["name"]

    db.add_internal_note(lead_id, uid, note)
    db.add_lead_log(lead_id, "nota_adicionada", uname, note)

    socketio.emit("new_note", {"lead_id": lead_id, "note": note, "user_name": uname}, room="gestores")
    return jsonify({"success": True})


# =======================
# WEBHOOK DO VENOMBOT
# =======================
@app.route("/api/webhook/message", methods=["POST"])
def webhook_message():
    data = request.json
    print(f"🔔 Webhook recebido: {data}")

    asyncio.run(
        whatsapp.on_message({
            "from": f"{data['phone']}@c.us",
            "body": data["content"],
            "notifyName": data.get("name", "Lead"),
            "fromMe": False,
        })
    )

    return jsonify({"success": True})


# =======================
# SOCKET.IO HANDLERS
# =======================
@socketio.on("connect")
def on_connect():
    print("🔌 Cliente conectado")


@socketio.on("disconnect")
def on_disconnect():
    print("🔌 Cliente desconectado")


@socketio.on("join_room")
def on_join(data):
    room = data.get("room")
    join_room(room)
    print(f"📍 Entrou na sala: {room}")


@socketio.on("leave_room")
def on_leave(data):
    room = data.get("room")
    leave_room(room)
    print(f"📍 Saiu da sala: {room}")


# =======================
# INICIALIZAÇÃO
# =======================
if __name__ == "__main__":
    print("🚀 Iniciando CRM WhatsApp com Timeline...")
    print("🌐 API: http://localhost:5000")
    print("🔌 Socket.io ativo\n")
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)