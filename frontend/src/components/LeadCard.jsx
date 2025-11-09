export default function LeadCard({ lead }) {
  const onDragStart = e => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  return (
    <div className="lead-card" draggable onDragStart={onDragStart}>
      <div className="lead-name">{lead.nome}</div>
      <div className="lead-info">
        <span>{lead.origem}</span>
        <span>{lead.cidade}</span>
      </div>
      <div className="lead-footer">
        <span className="small">#{lead.id}</span>
        <span className="status-tag">{lead.status}</span>
      </div>
    </div>
  );
}
