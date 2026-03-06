import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('me');
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');

  const [inboxes, setInboxes] = useState([]);
  const [inboxSelecionada, setInboxSelecionada] = useState('all');
  const [visaoAtiva, setVisaoAtiva] = useState('conversas'); 
  const [contatos, setContatos] = useState([]);
  const [buscaContato, setBuscaContato] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [novoContato, setNovoContato] = useState({ name: '', email: '', phone_number: '', inbox_id: '' });

  // Carregamento inicial de Inboxes e Contatos
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/inboxes', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json()).then(data => setInboxes(data.payload || []));

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json()).then(data => setContatos(data.payload || []));
  }, []);

  // Busca lista de conversas
  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = localStorage.getItem('authToken');
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations?assignee_type=${tipo}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(response => {
      setConversas(response.data?.payload || []);
      setCarregando(false);
    });
  };

  useEffect(() => { buscarConversas(abaAtiva); }, [abaAtiva]);

  // Abrir Chat
  const abrirConversa = (chatId) => {
    setConversaSelecionada(chatId);
    setCarregandoChat(true);
    const token = localStorage.getItem('authToken');
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${chatId}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      const msgLista = data.payload || data.data || [];
      setMensagens([...msgLista].sort((a, b) => a.id - b.id));
      setCarregandoChat(false);
    }).catch(() => setCarregandoChat(false));
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim()) return;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ content: novaMensagem })
      });
      if (response.ok) {
        const enviada = await response.json();
        setMensagens(prev => [...prev, enviada]); 
        setNovaMensagem(''); 
      }
    } catch (error) { console.error("Erro ao enviar:", error); }
  };

  return (
    <div style={{ display: 'flex', height: '88vh', backgroundColor: '#f0f2f5', margin: '-20px' }}>
      
      {/* --- BARRA LATERAL ESQUERDA (ESTILO CHATWOOT) --- */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>Caixa de Entrada</h3>
          
          {/* SUBMENU DE NAVEGAÇÃO INTERNA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '15px' }}>
            <div 
              onClick={() => setVisaoAtiva('conversas')}
              style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'conversas' ? '#eef6ff' : 'transparent', color: visaoAtiva === 'conversas' ? '#007bff' : '#555', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <span>💬</span> Todas as conversas
            </div>
            <div 
              onClick={() => setVisaoAtiva('contatos')}
              style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'contatos' ? '#eef6ff' : 'transparent', color: visaoAtiva === 'contatos' ? '#007bff' : '#555', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span>👥</span> Contatos</div>
              <span onClick={(e) => { e.stopPropagation(); setModalAberto(true); }} style={{ color: '#25D366', fontSize: '20px', fontWeight: 'bold' }}>+</span>
            </div>
          </div>

          {/* FILTROS E ABAS (SÓ APARECEM EM CONVERSAS) */}
          {visaoAtiva === 'conversas' && (
            <>
              <select value={inboxSelecionada} onChange={(e) => setInboxSelecionada(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                <option value="all">Todos os Canais</option>
                {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
                <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Abertas</button>
                <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
              </div>
            </>
          )}

          {visaoAtiva === 'contatos' && (
            <input type="text" placeholder="Buscar nos contatos..." value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          )}
        </div>

        {/* LISTA DE CONVERSAS OU CONTATOS */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visaoAtiva === 'conversas' ? (
             conversas.filter(chat => inboxSelecionada === 'all' || chat.inbox_id == inboxSelecionada).map(chat => {
               const nomeC = chat.meta?.sender?.name || "Cliente";
               const iniciaisC = nomeC.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
               return (
                 <div key={chat.id} onClick={() => abrirConversa(chat.id)} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', backgroundColor: conversaSelecionada === chat.id ? '#f0f7ff' : '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                     {chat.meta?.sender?.avatar_url ? <img src={chat.meta.sender.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : iniciaisC}
                   </div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ fontSize: '14px', fontWeight: chat.unread_count > 0 ? 'bold' : '500', display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeC}</span>
                       {chat.unread_count > 0 && <span style={{ backgroundColor: '#25D366', color: '#fff', borderRadius: '10px', padding: '2px 7px', fontSize: '10px' }}>{chat.unread_count}</span>}
                     </div>
                     <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.messages?.[0]?.content || "Conversa aberta"}</div>
                   </div>
                 </div>
               );
             })
          ) : (
            contatos.filter(c => c.name.toLowerCase().includes(buscaContato.toLowerCase())).map(c => (
              <div key={c.id} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{c.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{c.phone_number || 'Sem telefone'}</div>
                  </div>
                </div>
                <button onClick={() => {/* função iniciar conversa */}} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Enviar Mensagem</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ÁREA DO CHAT (DESIGN RESTAURADO) --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '12px 20px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>#{conversaSelecionada} - Chat Ativo</strong>
              <button style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '7px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✅ Resolver</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
              {carregandoChat ? <p>Carregando...</p> : mensagens.map((m, i) => {
                const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
                const iniciaisM = m.sender?.name?.charAt(0).toUpperCase();
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: eMinha ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    {/* AVATAR DENTRO DO CHAT */}
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: eMinha ? '#007bff' : '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                      {m.sender?.avatar_url ? <img src={m.sender.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : iniciaisM}
                    </div>
                    {/* BALÃO */}
                    <div style={{ maxWidth: '65%', padding: '8px 12px', borderRadius: '14px', backgroundColor: eMinha ? '#dcf8c6' : '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', position: 'relative' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#303030' }}>{m.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#999' }}>
                          {new Date(m.created_at * 1000 || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {eMinha && (
                          <span style={{ fontSize: '14px', color: m.status === 'read' ? '#34b7f1' : '#999', lineHeight: '10px' }}>
                            {m.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            <div style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '10px' }}>
              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} placeholder="Digite uma mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd' }} />
              <button onClick={enviarMensagem} style={{ padding: '10px 25px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '16px' }}>Selecione uma conversa ou contato para começar</div>
        )}
      </div>
    </div>
  );
};

const estiloTab = (ativo) => ({ flex: 1, padding: '7px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#444', fontWeight: '600' });

export default InboxPage;