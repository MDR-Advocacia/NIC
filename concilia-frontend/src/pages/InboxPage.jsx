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
  const [visaoAtiva, setVisaoAtiva] = useState('conversas'); // 'conversas' ou 'contatos'
  const [contatos, setContatos] = useState([]);
  const [buscaContato, setBuscaContato] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [novoContato, setNovoContato] = useState({ name: '', email: '', phone_number: '', inbox_id: '' });

  const carregarDadosIniciais = () => {
    const token = localStorage.getItem('authToken');
    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/inboxes', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => setInboxes(data.payload || []))
    .catch(err => console.error("Erro inboxes:", err));

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => setContatos(data.payload || []))
    .catch(err => console.error("Erro contatos:", err));
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
    } catch (error) { console.error("Erro ao iniciar:", error); }
    finally { setCarregandoChat(false); }
  };

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

  const encerrarAtendimento = async (chatId) => {
    if (!window.confirm("Deseja resolver esta conversa?")) return;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${chatId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (response.ok) {
        setConversaSelecionada(null);
        buscarConversas(abaAtiva);
      }
    } catch (error) { console.error("Erro ao resolver:", error); }
  };

  return (
    <div style={{ display: 'flex', height: '85vh', backgroundColor: '#f0f2f5', margin: '-20px' }}>
      
      {/* MODAL NOVO CONTATO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h3>Novo Contato</h3>
            <input style={estiloInput} placeholder="Nome" value={novoContato.name} onChange={e => setNovoContato({...novoContato, name: e.target.value})} />
            <input style={estiloInput} placeholder="Telefone" value={novoContato.phone_number} onChange={e => setNovoContato({...novoContato, phone_number: e.target.value})} />
            <select style={estiloInput} value={novoContato.inbox_id} onChange={e => setNovoContato({...novoContato, inbox_id: e.target.value})}>
              <option value="">Selecione o Canal...</option>
              {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px' }}>Cancelar</button>
              <button onClick={() => {/* função de criar */}} style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none' }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- BARRA LATERAL --- */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        
        {/* MENU SUPERIOR FIXO */}
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Caixa de Entrada</h3>
          
          {/* SUBMENU DE NAVEGAÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
            <div 
              onClick={() => setVisaoAtiva('conversas')}
              style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '5px', backgroundColor: visaoAtiva === 'conversas' ? '#f0f7ff' : 'transparent', color: visaoAtiva === 'conversas' ? '#007bff' : '#666', fontWeight: 'bold', fontSize: '14px' }}
            >
              💬 Conversas
            </div>
            <div 
              onClick={() => setVisaoAtiva('contatos')}
              style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '5px', backgroundColor: visaoAtiva === 'contatos' ? '#f0f7ff' : 'transparent', color: visaoAtiva === 'contatos' ? '#007bff' : '#666', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>👥 Contatos</span>
              <span onClick={(e) => { e.stopPropagation(); setModalAberto(true); }} style={{ color: '#25D366', fontSize: '18px' }}>+</span>
            </div>
          </div>

          {/* FILTROS DE CONVERSA (ABAS VOLTARAM AQUI) */}
          {visaoAtiva === 'conversas' && (
            <>
              <select value={inboxSelecionada} onChange={(e) => setInboxSelecionada(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}>
                <option value="all">Todos os Canais</option>
                {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
                <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Não atribuídas</button>
                <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
              </div>
            </>
          )}

          {/* BUSCA DE CONTATOS */}
          {visaoAtiva === 'contatos' && (
            <input type="text" placeholder="Pesquisar contato..." value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }} />
          )}
        </div>

        {/* LISTAGEM INFERIOR */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visaoAtiva === 'conversas' ? (
             conversas.filter(chat => inboxSelecionada === 'all' || chat.inbox_id == inboxSelecionada).map(chat => (
               <div key={chat.id} onClick={() => abrirConversa(chat.id)} style={{ padding: '12px 15px', borderBottom: '1px solid #f2f2f2', cursor: 'pointer', backgroundColor: conversaSelecionada === chat.id ? '#ebebeb' : '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{chat.meta?.sender?.name?.charAt(0)}</div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '14px', fontWeight: chat.unread_count > 0 ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between' }}>
                     {chat.meta?.sender?.name}
                     {chat.unread_count > 0 && <span style={{ backgroundColor: '#25D366', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '10px' }}>{chat.unread_count}</span>}
                   </div>
                 </div>
               </div>
             ))
          ) : (
            contatos.filter(c => c.name.toLowerCase().includes(buscaContato.toLowerCase())).map(c => (
              <div key={c.id} style={{ padding: '12px 15px', borderBottom: '1px solid #f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{c.phone_number || 'Sem telefone'}</div>
                  </div>
                </div>
                <button 
                  onClick={() => iniciarConversa(c.id)}
                  style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}
                >
                  Enviar Mensagem
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ÁREA DO CHAT --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '10px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>#{conversaSelecionada} - Chat Ativo</strong>
              <button onClick={() => encerrarAtendimento(conversaSelecionada)} style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>✅ Resolver</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#e5ddd5' }}>
              {mensagens.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: (m.message_type === 'outgoing' || m.message_type === 1) ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                  <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: '12px', backgroundColor: (m.message_type === 'outgoing' || m.message_type === 1) ? '#dcf8c6' : '#fff' }}>
                    <p style={{ margin: 0 }}>{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '10px' }}>
              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} style={{ flex: 1, padding: '10px', borderRadius: '25px', border: '1px solid #ddd' }} />
              <button onClick={enviarMensagem} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '25px' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Selecione uma conversa ou contato</div>
        )}
      </div>
    </div>
  );
};

const estiloTab = (ativo) => ({ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#333' });
const estiloInput = { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };

export default InboxPage;