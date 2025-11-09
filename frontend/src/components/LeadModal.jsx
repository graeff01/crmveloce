import { useEffect, useState } from 'react';
import { X, MessageSquare, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import api from '../api';

export default function LeadModal({ lead, onClose, onOpenChat }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(lead.status);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (lead?.id) loadMessages();
  }, [lead]);

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(lead.id);
      setMessages(data.slice(-5)); // últimas 5 mensagens
    } catch (e) {
      console.error('Erro ao carregar mensagens do lead:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (updating) return;
    setUpdating(true);
    try {
      await api.updateLeadStatus(lead.id, newStatus);
      setStatus(newStatus);
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="lead-modal-overlay">
      <div className="lead-modal">
        <div className="lead-modal-header">
          <h3>Detalhes do Lead</h3>
          <button onClick={onClose} className="close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="lead-modal-body">
          <div className="lead-info">
            <h4>{lead.name || lead.phone}</h4>
            <p>📱 {lead.phone}</p>
            {lead.city && <p>📍 {lead.city}</p>}
            {lead.origin && <p>🌐 Origem: {lead.origin}</p>}
            <p>Status atual: <span className={`status-tag ${status}`}>{status}</span></p>
          </div>

          <div className="lead-actions">
            <button
              className="btn btn-success"
              onClick={() => handleChangeStatus('ganho')}
              disabled={updating}
            >
              <CheckCircle2 size={16} /> Ganho
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleChangeStatus('perdido')}
              disabled={updating}
            >
              <XCircle size={16} /> Perdido
            </button>
            <button className="btn btn-primary" onClick={() => onOpenChat(lead)}>
              <MessageSquare size={16} /> Abrir no Chat
            </button>
          </div>

          <div className="lead-messages">
            <h5>Últimas Interações</h5>
            {loading ? (
              <div className="loading"><Loader2 className="spin" /> Carregando...</div>
            ) : messages.length === 0 ? (
              <p className="no-messages">Sem histórico de mensagens</p>
            ) : (
              <div className="messages-preview">
                {messages.map((msg, i) => (
                  <div key={i} className={`msg ${msg.sender_type}`}>
                    <p>{msg.content}</p>
                    <small>{new Date(msg.timestamp).toLocaleString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lead-ai">
            <h5>
              <Sparkles size={16} style={{ marginRight: '5px' }} />
              Análise Inteligente (em breve)
            </h5>
            <p>Em breve, a IA da Veloce vai gerar insights automáticos sobre cada lead.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
