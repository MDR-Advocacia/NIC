import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Dados de autenticação corrigidos
  const API_KEY = "gG4gX1KUxE4NrFtJjUynZw2c"; 
  const ACCOUNT_ID = "1";

  useEffect(() => {
  const token = localStorage.getItem('authToken'); 

  fetch('https://api-nic-lab.mdradvocacia.com/api/chatwoot-proxy', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })
    .then(res => res.json())
    .then(response => {
      console.log("Processando lista...", response);
      
      // O seu console mostrou que a lista está em response.data.payload
      const lista = response.data?.payload || response.payload || [];
      
      setConversas(lista);
      setCarregando(false);
    })
    .catch(err => {
      console.error("Erro ao processar conversas:", err);
      setCarregando(false);
    });
}, []);

  if (carregando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Carregando mensagens do WhatsApp...</h3>
        <p style={{ color: '#666' }}>Conectando à central MDR Advocacia</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Atendimento WhatsApp MDR</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {conversas.length > 0 ? (
          conversas.map(chat => (
            <div key={chat.id} style={{ 
              padding: '15px', 
              border: '1px solid #eee', 
              borderRadius: '10px', 
              background: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '16px', color: '#007bff' }}>
                  {chat.meta?.sender?.name || "Cliente WhatsApp"}
                </strong>
                <span style={{ fontSize: '11px', color: '#aaa', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                  ID #{chat.id}
                </span>
              </div>
              
              <p style={{ color: '#555', marginTop: '8px', fontSize: '14px', lineHeight: '1.4' }}>
                {chat.messages && chat.messages.length > 0 
                  ? chat.messages[0].content 
                  : "Nenhuma mensagem de texto disponível"}
              </p>
              
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
                Status: {chat.status === 'open' ? '🟢 Aberto' : '⚪ Resolvido'}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>
            <p>Nenhuma conversa encontrada no momento.</p>
            <small>As conversas do WhatsApp aparecerão aqui assim que chegarem.</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;