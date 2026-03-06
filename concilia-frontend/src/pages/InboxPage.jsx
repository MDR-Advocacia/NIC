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
  
  // Detalhes do contato para a Sidebar da Direita
  const [contatoParaDetalhar, setContatoParaDetalhar] = useState(null);

  const carregarDadosIniciais = () => {
    const token = localStorage.getItem('authToken');
    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/inboxes', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }).then(res => res.json()).then(data => setInboxes(data.payload || []));

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }).then(res => res.json()).then(data => setContatos(data.payload || []));
  };

  useEffect(() => { carregarDadosIniciais(); }, []);

  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = localStorage.getItem('authToken');
    fetch(`https://api-nic-lab.mdradvocacia.com/api/chat/conversations?assignee_type=${tipo}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }).then(res => res.json()).then(response => {
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
    }).then(res => res.json()).then(data => {
      const msgLista = data.payload || data.data || [];
      setMensagens([...msgLista].sort((a, b) => a.id - b.id));
      // Define o contato para a barra lateral direita
      setContatoParaDetalhar(data.meta?.sender || null);
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
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', height: '88vh', backgroundColor: '#f0f2f5', margin: '-20px' }}>
      
      {/* 1. MENU LATERAL (NIC) */}
      <div style={{ width: '220px', backgroundColor: '#fff', borderRight: '1px solid #ddd', padding: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: '15px', padding: '10px', backgroundColor: '#eef6ff', borderRadius: '8px' }}>📂 Caixa de Entrada</div>
        <div onClick={() => setVisaoAtiva('conversas')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'conversas' ? '#f0f0f0' : 'transparent', fontSize: '14px', marginBottom: '5px' }}>💬 Conversas</div>
        <div onClick={() => setVisaoAtiva('contatos')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'contatos' ? '#f0f0f0' : 'transparent', fontSize: '14px' }}>👥 Contatos</div>
      </div>

      {/* 2. COLUNA DE LISTAGEM */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          {visaoAtiva === 'conversas' ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
              <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Não atribuídas</button>
              <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
            </div>
          ) : (
            <input type="text" placeholder="Pesquisar contato..." value={buscaContato} onChange={e => setBuscaContato(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
           {(visaoAtiva === 'conversas' ? conversas : contatos.filter(c => c.name.toLowerCase().includes(buscaContato.toLowerCase()))).map(item => {
             const nome = item.name || item.meta?.sender?.name;
             const ultimaMsg = item.messages?.[0]?.content || item.phone_number || "Conversa aberta";
             return (
               <div key={item.id} onClick={() => visaoAtiva === 'conversas' ? abrirConversa(item.id) : setContatoParaDetalhar(item)} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', backgroundColor: (conversaSelecionada === item.id) ? '#f0f7ff' : '#fff' }}>
                 <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{nome}</div>
                 <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ultimaMsg}</div>
               </div>
             );
           })}
        </div>
      </div>

      {/* 3. ÁREA CENTRAL DO CHAT (ESTILO WHATSAPP) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#e5ddd5' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '12px 20px', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
              <strong>#{conversaSelecionada} - Chat Ativo</strong>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {mensagens.map((m, i) => {
                const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: eMinha ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    <div style={{ maxWidth: '65%', padding: '8px 12px', borderRadius: '14px', backgroundColor: eMinha ? '#dcf8c6' : '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
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
              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} placeholder="Digite uma mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd' }} />
              <button onClick={enviarMensagem} style={{ padding: '10px 25px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '25px', fontWeight: 'bold' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Selecione uma conversa para começar</div>
        )}
      </div>

      {/* 4. COLUNA DA DIREITA (DETALHES DO CONTATO - TEMA DARK) */}
      {contatoParaDetalhar && (
        <div style={{ width: '350px', backgroundColor: '#111', color: '#fff', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '10px', backgroundColor: '#553355', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>{contatoParaDetalhar.name?.charAt(0)}</div>
            <h2 style={{ margin: '15px 0 5px 0', fontSize: '20px' }}>{contatoParaDetalhar.name}</h2>
            <button style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Enviar mensagem</button>
          </div>

          <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
            <span style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '10px', cursor: 'pointer' }}>Atributos</span>
            <span style={{ color: '#888', cursor: 'pointer' }}>Histórico</span>
            <span style={{ color: '#888', cursor: 'pointer' }}>Notas</span>
          </div>

          <div style={estiloCampo}>
            <label style={{ color: '#888', fontSize: '12px' }}>NOME</label>
            <input style={estiloInputDark} defaultValue={contatoParaDetalhar.name} />
          </div>
          <div style={estiloCampo}>
            <label style={{ color: '#888', fontSize: '12px' }}>E-MAIL</label>
            <input style={estiloInputDark} defaultValue={contatoParaDetalhar.email} />
          </div>
          <div style={estiloCampo}>
            <label style={{ color: '#888', fontSize: '12px' }}>TELEFONE</label>
            <input style={estiloInputDark} defaultValue={contatoParaDetalhar.phone_number} />
          </div>
          
          <button style={{ marginTop: '10px', backgroundColor: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>Atualizar contato</button>
        </div>
      )}
    </div>
  );
};

const estiloInputDark = { width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' };
const estiloCampo = { marginBottom: '15px' };
const estiloTab = (ativo) => ({ flex: 1, padding: '7px', fontSize: '11px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#444', fontWeight: 'bold' });

export default InboxPage;