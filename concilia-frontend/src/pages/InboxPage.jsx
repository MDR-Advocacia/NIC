import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const API_KEY = "gG4gX1KUxE4NrFtJjUynZw2c"; 
    const ACCOUNT_ID = "1";
    
    // Usamos o AllOrigins mas de uma forma que ele não tente validar o conteúdo
    const targetUrl = `https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all&api_access_token=${API_KEY}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error("Erro na rede");
        return res.json();
      })
      .then(data => {
        // O AllOrigins embrulha o resultado em uma string chamada .contents
        if (data.contents) {
          const parsedData = JSON.parse(data.contents);
          const lista = parsedData.payload || parsedData;
          setConversas(Array.isArray(lista) ? lista : []);
        }
        setCarregando(false);
      })
      .catch(err => {
        console.error("Erro final:", err);
        setCarregando(false);
      });
  }, []);

  if (carregando) return <div style={{ padding: '20px' }}>Conectando ao WhatsApp MDR...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Atendimento WhatsApp MDR</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {conversas.length > 0 ? (
          conversas.map(chat => (
            <div key={chat.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
              <strong>{chat.meta?.sender?.name || "Cliente"}</strong>
              <p style={{ color: '#666' }}>
                {chat.messages?.[0]?.content || "Conversa iniciada"}
              </p>
            </div>
          ))
        ) : (
          <p>Nenhuma conversa ativa encontrada.</p>
        )}
      </div>
    </div>
  );
};

export default InboxPage;