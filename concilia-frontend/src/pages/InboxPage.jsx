import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Nova chave do perfil
  const API_KEY = "gG4gX1KUxE4NrFtJjUynZw2c"; 
  const ACCOUNT_ID = "1";

  useEffect(() => {
    const proxyUrl = "https://cors-anywhere.com/"; 
    const targetUrl = `https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all`;

    fetch(proxyUrl + targetUrl, {
      method: 'GET',
      headers: {
        'api_access_token': API_KEY,
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: Verifique a chave ou o ID da conta`);
      }
      return res.json();
    })
    .then(data => {
      // O Chatwoot costuma entregar a lista dentro de um array ou de um objeto .payload
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
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Carregando mensagens...</h3>
        <p>Se demorar, verifique se ativou o acesso em: <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank" rel="noreferrer">cors-anywhere.herokuapp.com/corsdemo</a></p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Atendimento WhatsApp MDR</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {conversas.length > 0 ? (
          conversas.map(chat => (
            <div key={chat.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{chat.meta?.sender?.name || "Cliente"}</strong>
                <span style={{ fontSize: '12px', color: '#999' }}>ID: {chat.id}</span>
              </div>
              <p style={{ color: '#666', marginTop: '5px' }}>
                {chat.messages && chat.messages.length > 0 ? chat.messages[0].content : "Sem mensagens recentes"}
              </p>
            </div>
          ))
        ) : (
          <p>Nenhuma conversa encontrada ou erro na conexão.</p>
        )}
      </div>
    </div>
  );
};

export default InboxPage;