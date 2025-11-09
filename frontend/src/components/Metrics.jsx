import { useEffect, useState, useMemo } from 'react';
import "../styles/components/metrics.css";
import api from '../api';

export default function Metrics({ currentUser }) {
  const [period, setPeriod] = useState('month');
  const [vendedorId, setVendedorId] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const periods = [
    { key: 'day', label: 'Hoje' },
    { key: 'week', label: '7 dias' },
    { key: 'month', label: '30 dias' },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      if (currentUser?.role === 'admin' || currentUser?.role === 'gestor') {
        const users = await api.getUsers();
        setVendedores(users.filter(u => u.role === 'vendedor' && u.active));
      }
    };
    fetchUsers();
  }, [currentUser]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await api.getMetrics({ period, vendedor_id: vendedorId || undefined });
      setData(response);
    } catch (err) {
      console.error('Erro ao carregar métricas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, vendedorId]);

  const funilArray = useMemo(() => {
    if (!data?.funil) return [];
    const order = ['novo', 'em_atendimento', 'qualificado', 'perdido', 'ganho'];
    return order.map(key => ({
      status: key,
      total: data.funil[key] ?? 0,
    }));
  }, [data]);

  if (loading) return <div className="metric-skeleton"></div>;

  return (
    <section className="metrics-page">
      <header className="metrics-header">
        <div>
          <h2>📊 Painel de Desempenho</h2>
          <p className="metrics-sub">
            Acompanhe os principais indicadores de vendas e performance.
          </p>
        </div>
      </header>

      {/* Wrapper geral */}
      <div className="metrics-wrapper">
        {/* Container centralizado */}
        <div className="metrics-container">

          {/* Filtros */}
          <div className="metrics-filters">
            <label className="field">
              <span>Período</span>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            {(currentUser?.role === 'admin' || currentUser?.role === 'gestor') && (
              <label className="field">
                <span>Vendedor</span>
                <select value={vendedorId} onChange={e => setVendedorId(e.target.value)}>
                  <option value="">Todos</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>
            )}

            <button className="btn refresh" onClick={fetchMetrics}>Atualizar</button>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Leads</div>
              <div className="kpi-value">{data?.total_leads ?? 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Ganhos</div>
              <div className="kpi-value">{data?.leads_ganhos ?? 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Taxa de Conversão</div>
              <div className="kpi-value">{data?.taxa_conversao ?? 0}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Tempo Médio 1ª Resposta</div>
              <div className="kpi-value">{data?.tempo_resposta ?? 0} min</div>
            </div>
          </div>

          {/* Painéis principais */}
          <div className="metrics-panels">
            {/* Funil */}
            <section className="panel">
              <div className="panel-title">Funil de Vendas</div>
              <div className="funnel">
                {funilArray.map(row => (
                  <div key={row.status} className="funnel-row">
                    <div className="funnel-label">{row.status.replace('_', ' ')}</div>
                    <div className="funnel-bar">
                      <div
                        className="funnel-fill"
                        style={{ width: `${calcWidth(row.total, funilArray)}%` }}
                      />
                    </div>
                    <div className="funnel-value">{row.total}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ranking */}
            <section className="panel">
              <div className="panel-title">🏆 Ranking de Vendedores</div>
              <div className="ranking">
                <div className="ranking-head">
                  <span>Vendedor</span>
                  <span>Ganhos</span>
                  <span>Taxa</span>
                </div>
                {(data?.ranking || []).map((r, i) => (
                  <div key={i} className="ranking-row">
                    <span className="truncate">{r.name}</span>
                    <span>{r.ganhos}</span>
                    <span>{r.taxa}%</span>
                  </div>
                ))}
                {(!data?.ranking || data.ranking.length === 0) && (
                  <div className="empty">Sem dados no período.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function calcWidth(v, rows) {
  const max = Math.max(1, ...rows.map(r => r.total || 0));
  return Math.round((v / max) * 100);
}
