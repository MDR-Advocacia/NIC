import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Chave de API extraída do seu código
  const API_KEY = "EAALPQHvqNkQBPzH75IZB2kBZCulsIQoplb4u3mCffixPvZBdL1jqW67TI5M0yb3HizO37WR6cptwHe3Uw7e4hZCQrZAOmE4LeyDN4wumHBp71BG9MAJCz5cXtGQTx2H8Ka38UtHGjZAkZB9onAhaHEa1cAx8l84LX2jDqOJsY2Ei9PrQzcjKdQxpqroRsVCoeLcrwZDZD"; 
  const ACCOUNT_ID = "1";

  useEffect(() => {
    const proxyUrl = "https://cors-anywhere.herokuapp.com/";
    const targetUrl = `https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations`;

    fetch(proxyUrl + targetUrl, {
      method: 'GET',
      headers: {
        'api_access_token': API_KEY,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(res => res.json())
    .then(data => {
      // O Chatwoot retorna a lista dentro de data (pode ser direto ou em .payload)
      const listaConversas = data.payload || data;
      setConversas(Array.isArray(listaConversas) ? listaConversas : []);
      setCarregando(false);
    })
    .catch(err => {
      console.error("Erro ao espelhar chat:", err);
      setCarregando(false);
    });
  }, []);

  if (carregando) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Carregando mensagens do WhatsApp...</h3>
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