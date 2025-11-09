import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import api from '../api';
import '../styles/components/login.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(username, password);
      if (res.success) onLogin(res.user);
    } catch (err) {
      alert('Erro ao fazer login');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <MessageCircle size={36} color="#fff" />
        </div>
        <h1 className="login-title">CRM WhatsApp</h1>
        <p className="login-subtitle">Sistema Multi-Atendente</p>
        
        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="login-input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="login-button" type="submit">Entrar</button>
        </form>

        <div className="login-info">
          Usuário: <strong style={{color: '#00a884'}}>admin</strong> / Senha: <strong style={{color: '#00a884'}}>admin123</strong>
        </div>
      </div>
    </div>
  );
}