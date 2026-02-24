import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (id: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id && password) {
      onLogin(id, password);
    }
  };

  return (
    <div className="login-view">
      <h1>My Lift</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-btn">
          Log in
        </button>
      </form>
    </div>
  );
};

export default Login;
