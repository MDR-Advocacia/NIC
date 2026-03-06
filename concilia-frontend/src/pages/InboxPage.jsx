import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('me');
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [detalhesContato, setDetalhesContato] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [editandoContato, setEditandoContato] = useState(null);
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
      // Carrega os detalhes do contato da conversa para a Sidebar
      setDetalhesContato(data.meta?.sender || null);
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
    } catch (e) { console.error(e); }
    finally { setCarregandoChat(false); }
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
        <div onClick={() => setVisaoAtiva('conversas')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'conversas' ? '#f0f0f0' : 'transparent', fontSize: '14px' }}>💬 Conversas</div>
        <div onClick={() => setVisaoAtiva('contatos')} style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: visaoAtiva === 'contatos' ? '#f0f0f0' : 'transparent', fontSize: '14px' }}>👥 Contatos</div>
      </div>

      {/* 2. COLUNA DE LISTAGEM */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          {visaoAtiva === 'conversas' ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
              {/* Aba corrigida para Não atribuídas conforme imagem */}
              <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Não atribuídas</button>
              <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
            </div>
          ) : (
            <input type="text" placeholder="Pesquisar contato..." style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
           {/* Mapeamento de lista mantendo a última mensagem */}
           {(visaoAtiva === 'conversas' ? conversas : contatos).map(item => (
             <div key={item.id} onClick={() => visaoAtiva === 'conversas' ? abrirConversa(item.id) : setEditandoContato(item)} style={{ padding: '12px 15px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
               <div style={{ fontWeight: 'bold' }}>{item.name || item.meta?.sender?.name}</div>
               <div style={{ fontSize: '12px', color: '#888' }}>{item.messages?.[0]?.content || item.phone_number || "Conversa aberta"}</div>
             </div>
           ))}
        </div>
      </div>

      {/* 3. ÁREA DE DETALHAMENTO (CONFORME IMAGEM DO CHATWOOT) */}
      <div style={{ flex: 1, display: 'flex', backgroundColor: '#111', color: '#fff', overflowY: 'auto' }}>
        {editandoContato ? (
          <div style={{ flex: 1, padding: '30px', display: 'flex' }}>
            {/* Coluna Principal de Edição */}
            <div style={{ flex: 2, paddingRight: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '10px', backgroundColor: '#553355', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{editandoContato.name?.charAt(0)}</div>
                  <h2 style={{ margin: 0 }}>{editandoContato.name}</h2>
                </div>
                <button onClick={() => iniciarConversa(editandoContato.id)} style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>Enviar mensagem</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={estiloCampo}>
                  <label>Nome</label>
                  <input style={estiloInputDark} defaultValue={editandoContato.name?.split(' ')[0]} />
                </div>
                <div style={estiloCampo}>
                  <label>Sobrenome</label>
                  <input style={estiloInputDark} defaultValue={editandoContato.name?.split(' ')[1]} />
                </div>
                <div style={estiloCampo}>
                  <label>E-mail</label>
                  <input style={estiloInputDark} defaultValue={editandoContato.email} placeholder="Digite o endereço de e-mail" />
                </div>
                <div style={estiloCampo}>
                  <label>Telefone</label>
                  <input style={estiloInputDark} defaultValue={editandoContato.phone_number} />
                </div>
              </div>

              <button style={{ marginTop: '20px', backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px' }}>Atualizar contato</button>
            </div>

            {/* Coluna Lateral de Atributos */}
            <div style={{ flex: 1, borderLeft: '1px solid #333', paddingLeft: '20px' }}>
              <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
                <span style={{ color: '#007bff', borderBottom: '2px solid #007bff' }}>Atributos</span>
                <span style={{ color: '#888' }}>Histórico</span>
                <span style={{ color: '#888' }}>Notas</span>
              </div>
              <p style={{ color: '#888', fontSize: '14px' }}>Não há atributos personalizados de contatos disponíveis nesta conta.</p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Selecione um contato para detalhar</div>
        )}
      </div>
    </div>
  );
};

// Estilos auxiliares para o tema Dark
const estiloInputDark = { width: '100%', padding: '12px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' };
const estiloCampo = { marginBottom: '15px' };
const estiloTab = (ativo) => ({ flex: 1, padding: '7px', fontSize: '11px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#007bff' : '#eee', color: ativo ? '#fff' : '#444', fontWeight: 'bold' });

export default InboxPage;