import React from 'react';

const InboxPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#005c4b', color: 'white', padding: '15px', borderRadius: '8px 8px 0 0' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Atendimento WhatsApp MDR</h2>
      </div>
      <div style={{ border: '1px solid #ddd', padding: '40px', textAlign: 'center', backgroundColor: '#fff' }}>
        <p style={{ color: '#666' }}>Acesse o painel de mensagens oficial da MDR Advocacia.</p>
        <button 
          onClick={() => window.open("https://chat.mdradvocacia.com/app/login", "_blank")}
          style={{
            backgroundColor: '#00a884',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Abrir Chatwoot ↗
        </button>
      </div>
    </div>
  );
};

export default InboxPage;