import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('me'); // 'me' = Minhas, 'unassigned' = Não Atribuídas, 'all' = Todas

  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = localStorage.getItem('authToken');

    // Chamando a nova função do seu ChatController com o filtro da aba
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations?assignee_type=${tipo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(response => {
        // O Chatwoot pode retornar os dados direto ou dentro de uma chave .data
        const lista = Array.isArray(response) ? response : (response.data || []);
        setConversas(lista);
        setCarregando(false);
      })
      .catch(err => {
        console.error("Erro ao buscar conversas:", err);
        setCarregando(false);
      });
  };

  // Recarrega sempre que você clicar em uma aba diferente
  useEffect(() => {
    buscarConversas(abaAtiva);
  }, [abaAtiva]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Atendimento WhatsApp MDR</h2>

      {/* Menu de Abas Estilo Chatwoot */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button 
          onClick={() => setAbaAtiva('me')}
          style={estiloBotao(abaAtiva === 'me')}
        >
          Minhas
        </button>
        <button 
          onClick={() => setAbaAtiva('unassigned')}
          style={estiloBotao(abaAtiva === 'unassigned')}
        >
          Não Atribuídas
        </button>
        <button 
          onClick={() => setAbaAtiva('all')}
          style={estiloBotao(abaAtiva === 'all')}
        >
          Todas
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {carregando ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Carregando conversas...</p>
        ) : conversas.length > 0 ? (
          conversas.map(chat => (
            <div key={chat.id} style={estiloCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '16px', color: '#007bff' }}>
                  {chat.meta?.sender?.name || "Cliente WhatsApp"}
                </strong>
                <span style={estiloBadge}>ID #{chat.id}</span>
              </div>
              
              <p style={{ color: '#555', marginTop: '8px', fontSize: '14px' }}>
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
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Nenhuma conversa nesta categoria.</p>
        )}
      </div>
    </div>
  );
};

// Estilos rápidos para o código ficar limpo
const estiloBotao = (ativo) => ({
  padding: '8px 16px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '5px',
  backgroundColor: ativo ? '#007bff' : '#f0f0f0',
  color: ativo ? '#fff' : '#333',
  fontWeight: ativo ? 'bold' : 'normal',
  transition: '0.3s'
});

const estiloCard = {
  padding: '15px', 
  border: '1px solid #eee', 
  borderRadius: '10px', 
  background: '#fff',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const estiloBadge = {
  fontSize: '11px', 
  color: '#aaa', 
  backgroundColor: '#f0f0f0', 
  padding: '2px 6px', 
  borderRadius: '4px'
};

export default InboxPage;