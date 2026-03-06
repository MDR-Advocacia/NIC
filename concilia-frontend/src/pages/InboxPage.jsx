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

  const carregarDadosIniciais = () => {
    const token = localStorage.getItem('authToken');
    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/inboxes', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json()).then(data => setInboxes(data.payload || []));

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json()).then(data => setContatos(data.payload || []));
  };

  useEffect(() => { carregarDadosIniciais(); }, []);

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

  const iniciarConversa = async (contactId) => {
    const token = localStorage.getItem('authToken');
    setCarregandoChat(true);
    try {
      const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/contacts/${contactId}/conversations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (data.id) {
        setVisaoAtiva('conversas');
        abrirConversa(data.id);
      }
    } catch (error) { 
      console.error("Erro ao iniciar chat:", error); 
    } finally { 
      setCarregandoChat(false); 
    }
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
      
      {/* MODAL NOVO CONTATO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h3 style={{marginTop: 0}}>Novo Contato</h3>
            <input required style={estiloInput} placeholder="Nome" value={novoContato.name} onChange={e => setNovoContato({...novoContato, name: e.target.value})} />
            <input style={estiloInput} placeholder="Telefone" value={novoContato.phone_number} onChange={e => setNovoContato({...novoContato, phone_number: e.target.value})} />
            <select required style={estiloInput} value={novoContato.inbox_id} onChange={e => setNovoContato({...novoContato, inbox_id: e.target.value})}>
              <option value="">Selecione o Canal...</option>
              {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px' }}>Cancelar</button>
              <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none' }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- BARRA LATERAL --- */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Caixa de Entrada</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '15px' }}>
            <div onClick={() => setVisaoAtiva('conversas')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'conversas' ? '#eef6ff' : 'transparent', color: visaoAtiva === 'conversas' ? '#007bff' : '#555', fontWeight: '600' }}>
              💬 Todas as conversas
            </div>
            <div onClick={() => setVisaoAtiva('contatos')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'contatos' ? '#eef6ff' : 'transparent', color: visaoAtiva === 'contatos' ? '#007bff' : '#555', fontWeight: '600', display: 'flex', justifyContent: 'space-between', paddingLeft: '20px' }}>
              <div>👥 Contatos</div>
              <span onClick={(e) => { e.stopPropagation(); setModalAberto(true); }} style={{ color: '#25D366', fontSize: '20px', fontWeight: 'bold' }}>+</span>
            </div>
          </div>

          {visaoAtiva === 'conversas' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
              <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Abertas</button>
              <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visaoAtiva === 'conversas' ? (
             conversas.map(chat => (
               <div key={chat.id} onClick={() => abrirConversa(chat.id)} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', backgroundColor: conversaSelecionada === chat.id ? '#f0f7ff' : '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {chat.meta?.sender?.avatar_url ? <img src={chat.meta.sender.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : chat.meta?.sender?.name?.charAt(0)}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: chat.unread_count > 0 ? 'bold' : '500', display: 'flex', justifyContent: 'space-between' }}>
                     {chat.meta?.sender?.name}
                     {chat.unread_count > 0 && <span style={{ backgroundColor: '#25D366', color: '#fff', borderRadius: '10px', padding: '2px 7px', fontSize: '10px' }}>{chat.unread_count}</span>}
                   </div>
                 </div>
               </div>
             ))
          ) : (
            contatos.filter(c => c.name.toLowerCase().includes(buscaContato.toLowerCase())).map(c => (
              <div key={c.id} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.name.charAt(0)}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.name}</div>
                </div>
                <button onClick={() => iniciarConversa(c.id)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>Enviar Mensagem</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ÁREA DO CHAT --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '12px 20px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>#{conversaSelecionada} - Chat Ativo</strong>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
              {mensagens.map((m, i) => {
                const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: eMinha ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden' }}>
                      {m.sender?.avatar_url ? <img src={m.sender.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : null}
                    </div>
                    <div style={{ maxWidth: '65%', padding: '8px 12px', borderRadius: '14px', backgroundColor: eMinha ? '#dcf8c6' : '#fff' }}>
                      <p style={{ margin: 0, fontSize: '14px' }}>{m.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#999' }}>{new Date(m.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {eMinha && <span style={{ fontSize: '14px', color: m.status === 'read' ? '#34b7f1' : '#999' }}>{m.status === 'read' ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '10px' }}>
              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd' }} />
              <button onClick={enviarMensagem} style={{ padding: '10px 25px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '25px' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Selecione uma conversa</div>
        )}
      </div>
    </div>
  );
};

const estiloTab = (ativo) => ({ flex: 1, padding: '7px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#444', fontWeight: '600' });
const estiloInput = { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };

export default InboxPage;