import { useEffect, useState } from "react";
import api from "../api";
import {
  Clock,
  MessageCircle,
  FileText,
  UserCheck,
  PlusCircle,
  Loader2,
} from "lucide-react";

export default function LeadTimeline({ leadId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // =============================
  // 🔁 CARREGAR HISTÓRICO
  // =============================
  useEffect(() => {
    if (!leadId) return;
    loadLogs();
  }, [leadId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getLeadLogs(leadId);
      setLogs(data);
    } catch (error) {
      console.error("Erro ao carregar histórico do lead:", error);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // 📝 ADICIONAR NOTA INTERNA
  // =============================
  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      setAddingNote(true);
      await api.addNote(leadId, note);
      setNote("");
      await loadLogs();
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
    } finally {
      setAddingNote(false);
    }
  };

  // =============================
  // 🔔 UTILITÁRIOS
  // =============================
  const getIcon = (action) => {
    if (action.includes("mensagem")) return <MessageCircle size={16} color="#3b82f6" />;
    if (action.includes("nota")) return <FileText size={16} color="#8b5cf6" />;
    if (action.includes("assign") || action.includes("transfer"))
      return <UserCheck size={16} color="#10b981" />;
    return <Clock size={16} color="#6b7280" />;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =============================
  // 🧱 RENDER
  // =============================
  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#9ca3af", textAlign: "center" }}>
        Carregando histórico...
      </div>
    );
  }

  return (
    <div className="timeline-wrapper">
      {/* ===== FORM DE NOVA NOTA ===== */}
      <div className="timeline-add-note">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Adicionar nota interna..."
          className="timeline-note-input"
        />
        <button
          className="timeline-add-btn"
          onClick={handleAddNote}
          disabled={!note.trim() || addingNote}
        >
          {addingNote ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <PlusCircle size={16} />
          )}
          {addingNote ? " Salvando..." : " Adicionar Nota"}
        </button>
      </div>

      {/* ===== HISTÓRICO ===== */}
      {logs.length === 0 ? (
        <div style={{ padding: "20px", color: "#9ca3af", textAlign: "center" }}>
          Nenhum registro ainda.
        </div>
      ) : (
        <div className="timeline-container">
          {logs.map((log, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-icon">{getIcon(log.action)}</div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <strong>{log.user}</strong>{" "}
                  <span className="timeline-time">{formatTime(log.timestamp)}</span>
                </div>
                <div className="timeline-details">{log.details}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
