import sqlite3
import hashlib

class Database:
    def __init__(self, db_name="crm_whatsapp.db"):
        self.db_name = db_name
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_name)

    def init_db(self):
        conn = self.get_connection()
        c = conn.cursor()

        # Usuários
        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT,
                active INTEGER DEFAULT 1
            )
        """)

        # Leads
        c.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                phone TEXT,
                status TEXT DEFAULT 'novo',
                assigned_to INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Mensagens
        c.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER,
                sender_type TEXT,
                sender_name TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Notas internas
        c.execute("""
            CREATE TABLE IF NOT EXISTS internal_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER,
                user_id INTEGER,
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Logs de auditoria
        c.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Timeline do lead
        c.execute("""
            CREATE TABLE IF NOT EXISTS lead_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                user_name TEXT NOT NULL,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (lead_id) REFERENCES leads(id)
            )
        """)

        conn.commit()

        # Usuário admin padrão
        c.execute("SELECT * FROM users WHERE username = 'admin'")
        if not c.fetchone():
            self.create_user("admin", "admin123", "Administrador", "admin")
            print("👤 Usuário criado: admin / admin123")

        conn.close()

    def hash_password(self, password):
        return hashlib.sha256(password.encode()).hexdigest()

    def authenticate_user(self, username, password):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = ? AND active = 1", (username,))
        user = c.fetchone()
        conn.close()
        if user and user[2] == self.hash_password(password):
            return {"id": user[0], "username": user[1], "password": user[2], "name": user[3], "role": user[4], "active": user[5]}
        return None

    def create_user(self, username, password, name, role):
        try:
            conn = self.get_connection()
            c = conn.cursor()
            c.execute("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)",
                     (username, self.hash_password(password), name, role))
            conn.commit()
            uid = c.lastrowid
            conn.close()
            return uid
        except sqlite3.IntegrityError:
            return None

    def get_all_users(self):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, username, name, role, active FROM users")
        users = [{"id": r[0], "username": r[1], "name": r[2], "role": r[3], "active": r[4]} for r in c.fetchall()]
        conn.close()
        return users

    def update_user(self, user_id, name, role, active):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?", (name, role, active, user_id))
        conn.commit()
        conn.close()

    def delete_user(self, user_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("UPDATE users SET active = 0 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

    def create_or_get_lead(self, phone, name):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, name, phone FROM leads WHERE phone = ?", (phone,))
        lead = c.fetchone()
        if lead:
            conn.close()
            return {"id": lead[0], "name": lead[1], "phone": lead[2]}
        c.execute("INSERT INTO leads (name, phone, status) VALUES (?, ?, 'novo')", (name, phone))
        lead_id = c.lastrowid
        conn.commit()
        conn.close()
        return {"id": lead_id, "name": name, "phone": phone}

    def get_lead(self, lead_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, name, phone, status, assigned_to FROM leads WHERE id = ?", (lead_id,))
        r = c.fetchone()
        conn.close()
        if r:
            return {"id": r[0], "name": r[1], "phone": r[2], "status": r[3], "assigned_to": r[4]}
        return None

    def get_all_leads(self):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("""SELECT l.id, l.name, l.phone, l.status, l.assigned_to, u.name, l.updated_at
                     FROM leads l LEFT JOIN users u ON l.assigned_to = u.id ORDER BY l.updated_at DESC""")
        leads = [{"id": r[0], "name": r[1], "phone": r[2], "status": r[3], "assigned_to": r[4],
                  "vendedor_name": r[5], "updated_at": r[6]} for r in c.fetchall()]
        conn.close()
        return leads

    def get_leads_by_vendedor(self, vendedor_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, name, phone, status, updated_at FROM leads WHERE assigned_to = ? ORDER BY updated_at DESC", (vendedor_id,))
        leads = [{"id": r[0], "name": r[1], "phone": r[2], "status": r[3], "updated_at": r[4]} for r in c.fetchall()]
        conn.close()
        return leads

    def get_leads_by_status(self, status):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, name, phone, status, updated_at FROM leads WHERE status = ?", (status,))
        leads = [{"id": r[0], "name": r[1], "phone": r[2], "status": r[3], "updated_at": r[4]} for r in c.fetchall()]
        conn.close()
        return leads

    def assign_lead(self, lead_id, user_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("UPDATE leads SET assigned_to = ?, status = 'em_atendimento', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                 (user_id, lead_id))
        conn.commit()
        conn.close()

    def update_lead_status(self, lead_id, status):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, lead_id))
        conn.commit()
        conn.close()

    def get_messages_by_lead(self, lead_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, sender_type, sender_name, content, timestamp FROM messages WHERE lead_id = ? ORDER BY id ASC", (lead_id,))
        msgs = [{"id": r[0], "sender_type": r[1], "sender_name": r[2], "content": r[3], "timestamp": r[4]} for r in c.fetchall()]
        conn.close()
        return msgs

    def add_message(self, lead_id, sender_type, sender_name, content):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("INSERT INTO messages (lead_id, sender_type, sender_name, content) VALUES (?, ?, ?, ?)",
                 (lead_id, sender_type, sender_name, content))
        conn.commit()
        conn.close()

    def get_internal_notes(self, lead_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("""SELECT n.id, n.note, u.name, n.created_at FROM internal_notes n
                     JOIN users u ON n.user_id = u.id WHERE n.lead_id = ? ORDER BY n.created_at DESC""", (lead_id,))
        notes = [{"id": r[0], "note": r[1], "user_name": r[2], "created_at": r[3]} for r in c.fetchall()]
        conn.close()
        return notes

    def add_internal_note(self, lead_id, user_id, note):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("INSERT INTO internal_notes (lead_id, user_id, note) VALUES (?, ?, ?)", (lead_id, user_id, note))
        conn.commit()
        conn.close()

    def add_lead_log(self, lead_id, action, user_name, details=""):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("INSERT INTO lead_logs (lead_id, action, user_name, details) VALUES (?, ?, ?, ?)",
                 (lead_id, action, user_name, details))
        conn.commit()
        conn.close()

    def get_lead_logs(self, lead_id):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT action, user_name, details, timestamp FROM lead_logs WHERE lead_id = ? ORDER BY id DESC", (lead_id,))
        logs = [{"action": r[0], "user": r[1], "details": r[2], "timestamp": r[3]} for r in c.fetchall()]
        conn.close()
        return logs

    def get_metrics_summary(self):
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM leads")
        total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM leads WHERE status = 'ganho'")
        ganhos = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM leads WHERE status = 'perdido'")
        perdidos = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM leads WHERE status = 'em_atendimento'")
        ativos = c.fetchone()[0]
        funil = {"novo": total - ganhos - perdidos - ativos, "em_atendimento": ativos, "ganho": ganhos, "perdido": perdidos}
        conn.close()
        return {"total_leads": total, "leads_ganhos": ganhos, "leads_perdidos": perdidos, "funil": funil}