import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Key } from 'lucide-react';
import api from '../api';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'vendedor'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.getUsers();
    setUsers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
      } else {
        await api.createUser(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', name: '', role: 'vendedor' });
      loadUsers();
    } catch (error) {
      alert('Erro ao salvar usuário');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, role: user.role, username: user.username });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (confirm('Desativar este usuário?')) {
      await api.deleteUser(userId);
      loadUsers();
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#e9edef' }}>Gestão de Usuários</h2>
        {currentUser.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingUser(null); }}>
            <Plus size={18} /> Novo Usuário
          </button>
        )}
      </div>

      <div style={{ background: '#202c33', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#2a3942' }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>Nome</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Usuário</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Perfil</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
              {currentUser.role === 'admin' && <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #2a3942' }}>
                <td style={{ padding: '15px' }}>{user.name}</td>
                <td style={{ padding: '15px', color: '#8696a0' }}>{user.username}</td>
                <td style={{ padding: '15px' }}>
                  <span className="role-badge">{user.role}</span>
                </td>
                <td style={{ padding: '15px' }}>
                  {user.active ? '✅ Ativo' : '❌ Inativo'}
                </td>
                {currentUser.role === 'admin' && (
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button className="btn btn-secondary" style={{ marginRight: '5px', padding: '5px 10px' }} onClick={() => handleEdit(user)}>
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '5px 10px' }} onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#202c33',
            padding: '30px',
            borderRadius: '15px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ marginBottom: '20px' }}>{editingUser ? 'Editar' : 'Novo'} Usuário</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              {!editingUser && (
                <>
                  <div className="form-group">
                    <label>Usuário (login)</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Senha</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Salvar
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
