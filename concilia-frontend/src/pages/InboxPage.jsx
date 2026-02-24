import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Chave do Perfil e ID da Conta
  const API_KEY = "gG4gX1KUxE4NrFtJjUynZw2c"; 
  const ACCOUNT_ID = "1";

  useEffect(() => {
    // Usaremos o AllOrigins que é um dos mais estáveis para apenas "ler" dados
    const targetUrl = `https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all&api_access_token=${API_KEY}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    fetch(proxyUrl)
      .then(res => res.json())
      .then(data => {
        if (data.contents) {
          const parsedData = JSON.parse(data.contents);
          const lista = parsedData.payload || parsedData;
          setConversas(Array.isArray(lista) ? lista : []);
        }
        setCarregando(false);
      })
      .catch(err => {
        console.error("Erro de conexão com o Chatwoot:", err);
        setCarregando(false);
      });
  }, []);

  if (carregando) return <div style={{ padding: '20px' }}>Carregando Central de Mensagens...</div>;

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: '15px', backgroundColor: '#005c4b', color: 'white' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Atendimento WhatsApp MDR</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {conversas.length > 0 ? (
          conversas.map(chat => (
            <div key={chat.id} style={{ 
              backgroundColor: 'white', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }} onClick={() => window.open(`https://chat.mdradvocacia.com/app/accounts/1/inbox/4`, '_blank')}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#111b21' }}>{chat.meta?.sender?.name || "Cliente"}</strong>
                <span style={{ fontSize: '12px', color: '#667781' }}>ID: {chat.id}</span>
              </div>
              <p style={{ color: '#667781', fontSize: '14px', margin: '5px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chat.messages?.[0]?.content || "Clique para ver a conversa"}
              </p>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px' }}>
            <p style={{ color: '#667781' }}>Não foi possível carregar as conversas diretamente por restrições de segurança do navegador.</p>
            <button 
              onClick={() => window.open("https://chat.mdradvocacia.com/app/login", "_blank")}
              style={{
                backgroundColor: '#00a884',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '15px'
              }}
            >
              Abrir Central de Atendimento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;