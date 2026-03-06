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

  // FUNÇÃO PARA CLICAR NO CONTATO E ABRIR O CHAT
  const iniciarConversa = async (contactId) => {
    const token = localStorage.getItem('authToken');
    setCarregandoChat(true);
    try {
      // Aqui usamos a rota que cria ou busca uma conversa para o contato
      const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/contacts/${contactId}/conversations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const data = await response.json();
      
      if (data.id) {
        setVisaoAtiva('conversas'); // Volta para a aba de chats
        abrirConversa(data.id);      // Abre a conversa retornada
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    } finally {
      setCarregandoChat(false);
    }
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

  const criarContato = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(novoContato)
      });
      if (response.ok) {
        setModalAberto(false);
        setNovoContato({ name: '', email: '', phone_number: '', inbox_id: '' });
        carregarDadosIniciais();
        alert("Contato criado com sucesso!");
      }
    } catch (error) { console.error("Erro ao criar contato:", error); }
  };

  return (
    <div style={{ display: 'flex', height: '85vh', backgroundColor: '#f0f2f5', margin: '-20px' }}>
      
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h3>Novo Contato</h3>
            <form onSubmit={criarContato}>
              <label>Nome *</label>
              <input required style={estiloInput} type="text" value={novoContato.name} onChange={e => setNovoContato({...novoContato, name: e.target.value})} />
              <label>Telefone</label>
              <input style={estiloInput} type="text" value={novoContato.phone_number} onChange={e => setNovoContato({...novoContato, phone_number: e.target.value})} />
              <label>Canal de Origem *</label>
              <select required style={estiloInput} value={novoContato.inbox_id} onChange={e => setNovoContato({...novoContato, inbox_id: e.target.value})}>
                <option value="">Selecione...</option>
                {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none' }}>Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LATERAL */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>{visaoAtiva === 'conversas' ? 'Chats' : 'Contatos'}</h3>
            <div style={{ display: 'flex', gap: '5px' }}>
              {visaoAtiva === 'contatos' && <button onClick={() => setModalAberto(true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>+</button>}
              <button onClick={() => setVisaoAtiva(visaoAtiva === 'conversas' ? 'contatos' : 'conversas')} style={{ fontSize: '12px', color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}>
                {visaoAtiva === 'conversas' ? '👥 Contatos' : '💬 Chats'}
              </button>
            </div>
          </div>
          {visaoAtiva === 'conversas' ? (
            <select value={inboxSelecionada} onChange={(e) => setInboxSelecionada(e.target.value)} style={{ width: '100%', padding: '8px' }}>
              <option value="all">Todos os Canais</option>
              {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
            </select>
          ) : (
            <input type="text" placeholder="Buscar..." value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} style={{ width: '100%', padding: '8px' }} />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {carregando ? <p style={{padding: '20px'}}>Carregando...</p> : (
            visaoAtiva === 'conversas' ? (
              conversas.filter(chat => inboxSelecionada === 'all' || chat.inbox_id == inboxSelecionada).map(chat => (
                <div key={chat.id} onClick={() => abrirConversa(chat.id)} style={{ padding: '12px 15px', borderBottom: '1px solid #f2f2f2', cursor: 'pointer', backgroundColor: conversaSelecionada === chat.id ? '#ebebeb' : '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {chat.meta?.sender?.name?.charAt(0)}
                  </div>
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
                <div key={c.id} onClick={() => iniciarConversa(c.id)} style={{ padding: '12px 15px', borderBottom: '1px solid #f2f2f2', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{c.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{c.phone_number || 'Sem telefone'}</div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* --- ÁREA DO CHAT --- */}
<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
  {conversaSelecionada ? (
    <>
      {/* CABEÇALHO COM BOTÃO RESOLVER */}
      <div style={{ 
        padding: '10px 15px', 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #ddd', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <strong style={{ fontSize: '16px' }}>#{conversaSelecionada} - Chat Ativo</strong>
        </div>
        
        <button 
          onClick={() => encerrarAtendimento(conversaSelecionada)}
          style={{ 
            backgroundColor: '#007bff', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 15px', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          ✅ Resolver Conversa
        </button>
      </div>

      {/* MENSAGENS E INPUT (CONTINUAM IGUAIS) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
         {/* ... (map das mensagens) ... */}
      </div>
      {/* ... (input de envio) ... */}
    </>
  ) : (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
      Selecione um chat ou contato para iniciar
    </div>
  )}
</div>
    </div>
  );
};
const encerrarAtendimento = async (chatId) => {
  if (!window.confirm("Deseja marcar esta conversa como resolvida?")) return;

  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations/${chatId}/resolve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (response.ok) {
      setConversaSelecionada(null); // Fecha o chat da tela
      setMensagens([]);            // Limpa mensagens
      buscarConversas(abaAtiva);   // Atualiza a lista lateral para remover a resolvida
      alert("Conversa resolvida com sucesso!");
    }
  } catch (error) {
    console.error("Erro ao resolver:", error);
  }
};
const estiloTab = (ativo) => ({ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#333', border: 'none', borderRadius: '4px' });
const estiloInput = { width: '100%', padding: '8px', marginTop: '5px', marginBottom: '15px' };

export default InboxPage;