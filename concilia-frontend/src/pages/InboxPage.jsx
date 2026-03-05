import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('me');
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');

  // 1. Busca a lista de conversas da lateral
  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = localStorage.getItem('authToken');
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations?assignee_type=${tipo}`, {
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/json',
        'Content-Type': 'application/json' 
      }
    })
      .then(res => res.json())
      .then(response => {
        const lista = response.data?.payload || [];
        setConversas(lista);
        setCarregando(false);
      });
  };

  // 2. Carrega as mensagens de um chat específico
  const abrirConversa = (chatId) => {
    setConversaSelecionada(chatId);
    setCarregandoChat(true);
    const token = localStorage.getItem('authToken');

    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${chatId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        // Pega a lista de mensagens (payload ou data)
        const msgLista = data.payload || data.data || [];
        
        // ORDENAÇÃO: Garante que a mensagem com ID menor (mais antiga) fique em cima
        // e a com ID maior (mais nova) fique embaixo.
        const ordenada = [...msgLista].sort((a, b) => a.id - b.id);
        
        setMensagens(ordenada);
        setCarregandoChat(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar mensagens:", err);
        setCarregandoChat(false);
      });
  };

  // 3. Envia nova mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim()) return;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ content: novaMensagem })
      });

      if (response.ok) {
        const enviada = await response.json();
        // Adiciona a mensagem enviada ao fim da lista (já que está em ordem de leitura)
        setMensagens(prev => [...prev, enviada]); 
        setNovaMensagem(''); 
      }
    } catch (error) {
      console.error("Erro ao enviar:", error);
    }
  };

  // Hook para atualizar a lista lateral quando troca de aba
  useEffect(() => { 
    buscarConversas(abaAtiva); 
  }, [abaAtiva]);

  // Hook para TEMPO REAL: Atualiza o chat a cada 5 segundos
  useEffect(() => {
    let intervalo;
    if (conversaSelecionada) {
      abrirConversa(conversaSelecionada);

      intervalo = setInterval(() => {
  // Só busca se a página estiver visível para o usuário
  if (document.visibilityState === 'visible') {
    const token = localStorage.getItem('authToken');
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${conversaSelecionada}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json' 
      }
    })
    .then(res => res.json())
    .then(data => {
      const msgLista = data.payload || [];
      setMensagens(prev => prev.length !== msgLista.length ? [...msgLista].reverse() : prev);
    })
    .catch(err => console.log("Timeout ou erro na rede, tentando na próxima..."));
  }
}, 5000); // Aumentado para 5 segundos
    }
    return () => clearInterval(intervalo);
  }, [conversaSelecionada]);

  return (
    <div style={{ display: 'flex', height: '85vh', backgroundColor: '#f0f2f5', margin: '-20px' }}>
      
      {/* BARRA LATERAL */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>WhatsApp MDR</h3>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
            <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Abertas</button>
            <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {carregando ? <p style={{padding: '20px'}}>Carregando...</p> : conversas.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => abrirConversa(chat.id)}
              style={{
                padding: '15px',
                borderBottom: '1px solid #f2f2f2',
                cursor: 'pointer',
                backgroundColor: conversaSelecionada === chat.id ? '#ebebeb' : '#fff'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{chat.meta?.sender?.name || "Cliente"}</div>
              <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chat.messages?.[0]?.content || "Conversa aberta"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DO CHAT (DESIGN BALÕES) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
              <strong>#{conversaSelecionada} - Chat Ativo</strong>
            </div>

            {/* Mensagens com Avatares e Status */}
<div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
  {carregandoChat ? (
    <p>Carregando histórico...</p>
  ) : (
    mensagens.map((m, i) => {
      const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
      const nomeRemetente = m.sender?.name || "Cliente";
      const iniciais = nomeRemetente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      return (
        <div 
          key={i} 
          style={{ 
            display: 'flex', 
            flexDirection: eMinha ? 'row-reverse' : 'row', 
            alignItems: 'flex-end',
            marginBottom: '15px',
            gap: '10px'
          }}
        >
          {/* Avatar ou Iniciais */}
          <div style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            backgroundColor: eMinha ? '#007bff' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {m.sender?.avatar_url ? (
              <img src={m.sender.avatar_url} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            ) : iniciais}
          </div>

          {/* Balão */}
          <div style={{
            maxWidth: '70%',
            padding: '8px 12px',
            borderRadius: '12px',
            backgroundColor: eMinha ? '#dcf8c6' : '#fff',
            boxShrink: 1,
            boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#303030', wordBreak: 'break-word' }}>{m.content}</p>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px' 
            }}>
              <span style={{ fontSize: '10px', color: '#999' }}>
                {new Date(m.created_at * 1000 || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              {/* Status de Envio (Checks) */}
              {eMinha && (
                <span style={{ fontSize: '12px', color: m.status === 'read' ? '#34b7f1' : '#999' }}>
                  {m.status === 'sent' ? '✓' : '✓✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    })
  )}
  {/* Div oculta para forçar o scroll para baixo sempre que carregar novas mensagens */}
  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
</div>

            <div style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '10px' }}>
              <input 
                type="text" value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                placeholder="Digite uma mensagem..." 
                style={{ flex: 1, padding: '10px', borderRadius: '25px', border: '1px solid #ddd' }} 
              />
              <button onClick={enviarMensagem} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            Selecione uma conversa para atender
          </div>
        )}
      </div>
    </div>
  );
};

const estiloTab = (ativo) => ({
  flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', borderRadius: '4px',
  backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#333'
});

export default InboxPage;