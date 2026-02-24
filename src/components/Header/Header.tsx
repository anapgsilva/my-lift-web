import React, { useState, useEffect, useRef } from 'react';
import './Header.css';

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

interface User {
  isLoggedIn: boolean;
}

interface HeaderProps {
  user?: User;
  onLogout?: () => void;
  isListening?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, isListening }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const saved = localStorage.getItem('selectedVoice');
    if (saved) setSelectedVoice(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = () => {
    setShowMenu(false);
    onLogout?.();
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceName = e.target.value;
    setSelectedVoice(voiceName);
    localStorage.setItem('selectedVoice', voiceName);
  };

  return (
    <header>
      <h1>My Lift</h1>

      <div>
        {user?.isLoggedIn ? (
          <div className="profile-wrapper" ref={menuRef}>
            <div 
              className={`profile-circle ${isListening ? 'disabled' : ''}`} 
              onClick={() => !isListening && setShowMenu(!showMenu)}
            >
              <ProfileIcon />
            </div>
            {showMenu && (
              <div className="profile-menu">
                <div className="voice-selector">
                  <label>Voice:</label>
                  <select value={selectedVoice} onChange={handleVoiceChange}>
                    <option value="">Default</option>
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="logout-btn" onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-btn">
            Log in
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;