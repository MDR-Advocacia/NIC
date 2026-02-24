import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Dados de autenticação corrigidos
  const API_KEY = "gG4gX1KUxE4NrFtJjUynZw2c"; 
  const ACCOUNT_ID = "1";

  useEffect(() => {
    // Usando o proxy estável que você encontrou
    const proxyUrl = "https://cors-anywhere.com/"; 
    
    // Inserindo a API_KEY na URL para evitar bloqueio de cabeçalho (CORS)
    const targetUrl = `https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all&api_access_token=${API_KEY}`;

    fetch(proxyUrl + targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 401) throw new Error("Acesso negado (401): Verifique a Chave API no perfil");
      if (res.status === 404) throw new Error("Conta não encontrada (404): Verifique o ID da conta");
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Dados que chegaram do Chatwoot:", data);
      
      // O Chatwoot pode retornar os dados direto ou dentro de .payload
      const lista = data.payload || data;
      setConversas(Array.isArray(lista) ? lista : []);
      setCarregando(false);
    })
    .catch(err => {
      console.error("Erro no espelhamento:", err.message);
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