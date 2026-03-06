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
  const [contatoParaDetalhar, setContatoParaDetalhar] = useState(null);

  const carregarDadosIniciais = () => {
    const token = localStorage.getItem('authToken');
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/inboxes', { headers })
      .then(res => res.json()).then(data => setInboxes(data.payload || []));

    fetch('https://api-nic-lab.mdradvocacia.com/api/chat/contacts', { headers })
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
    }).catch(() => setCarregando(false));
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
    <div style={{ display: 'flex', height: '88vh', backgroundColor: '#f8f9fa', margin: '-20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. MENU LATERAL (NIC) - CLEAN */}
      <div style={{ width: '240px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', padding: '15px' }}>
        <div style={{ fontWeight: '800', color: '#1a73e8', marginBottom: '25px', padding: '12px', backgroundColor: '#f0f4ff', borderRadius: '10px', fontSize: '14px', textAlign: 'center' }}>
          NIC AGENT
        </div>
        <div 
          onClick={() => setVisaoAtiva('conversas')}
          style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: visaoAtiva === 'conversas' ? '#f1f3f4' : 'transparent', color: visaoAtiva === 'conversas' ? '#1a73e8' : '#5f6368', fontWeight: '600', fontSize: '14px', marginBottom: '8px', transition: '0.3s' }}
        >
          💬 Mensagens
        </div>
        <div 
          onClick={() => setVisaoAtiva('contatos')}
          style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: visaoAtiva === 'contatos' ? '#f1f3f4' : 'transparent', color: visaoAtiva === 'contatos' ? '#1a73e8' : '#5f6368', fontWeight: '600', fontSize: '14px', transition: '0.3s' }}
        >
          👥 Contatos
        </div>
      </div>

      {/* 2. COLUNA DE LISTAGEM - WHITE DESIGN */}
      <div style={{ width: '380px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <select 
            value={inboxSelecionada} 
            onChange={(e) => setInboxSelecionada(e.target.value)} 
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #dcdcdc', backgroundColor: '#f9f9f9', outline: 'none', fontSize: '13px' }}
          >
            <option value="all">Todos os Canais</option>
            {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
          </select>

          {visaoAtiva === 'conversas' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setAbaAtiva('me')} style={estiloTab(abaAtiva === 'me')}>Minhas</button>
              <button onClick={() => setAbaAtiva('unassigned')} style={estiloTab(abaAtiva === 'unassigned')}>Não atribuídas</button>
              <button onClick={() => setAbaAtiva('all')} style={estiloTab(abaAtiva === 'all')}>Todas</button>
            </div>
          ) : (
            <input type="text" placeholder="Pesquisar por nome..." value={buscaContato} onChange={e => setBuscaContato(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dcdcdc' }} />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
           {(visaoAtiva === 'conversas' ? conversas : contatos.filter(c => c.name.toLowerCase().includes(buscaContato.toLowerCase()))).map(item => {
             const nome = item.name || item.meta?.sender?.name;
             const iniciais = nome?.charAt(0).toUpperCase();
             const ultimaMsg = item.messages?.[0]?.content || item.phone_number || "Sem histórico";
             return (
               <div key={item.id} onClick={() => visaoAtiva === 'conversas' ? abrirConversa(item.id) : setContatoParaDetalhar(item)} style={{ padding: '15px 20px', borderBottom: '1px solid #f8f8f8', cursor: 'pointer', backgroundColor: (conversaSelecionada === item.id) ? '#e8f0fe' : '#fff', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dadce0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#5f6368', flexShrink: 0 }}>{iniciais}</div>
                 <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontWeight: '700', fontSize: '14px', color: '#202124' }}>{nome}</div>
                   <div style={{ fontSize: '12px', color: '#70757a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ultimaMsg}</div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* 3. ÁREA CENTRAL DO CHAT - WHATSAPP CLEAN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '15px 25px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#202124' }}>{contatoParaDetalhar?.name}</span>
              <button style={{ backgroundColor: '#fff', border: '1px solid #dadce0', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Resolver</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column' }}>
              {mensagens.map((m, i) => {
  const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
  // Pega a primeira letra do nome para o caso de não ter foto
  const iniciaisM = m.sender?.name?.charAt(0).toUpperCase() || "C";
  
  return (
    <div key={i} style={{ display: 'flex', flexDirection: eMinha ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '15px', gap: '8px' }}>
      
      {/* ADICIONE/CORRIJA ESTE BLOCO DO AVATAR ABAIXO */}
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '50%', 
        backgroundColor: eMinha ? '#1a73e8' : '#6c757d', 
        color: '#fff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: '12px', 
        fontWeight: 'bold', 
        overflow: 'hidden', 
        flexShrink: 0 
      }}>
        {m.sender?.avatar_url ? (
          <img src={m.sender.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
        ) : (
          iniciaisM
        )}
      </div>

      {/* O seu balão de mensagem (Bubble) continua aqui abaixo sem alterações... */}
      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '12px', backgroundColor: eMinha ? '#e3f2fd' : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', border: '1px solid #e0e0e0' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>{m.content}</p>
        {/* ... resto do seu código de horário e checks ... */}
      </div>
    </div>
  );
})}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
            <div style={{ padding: '20px', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '12px' }}>
              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} placeholder="Escreva sua mensagem..." style={{ flex: 1, padding: '12px 18px', borderRadius: '30px', border: '1px solid #dadce0', backgroundColor: '#f1f3f4', outline: 'none' }} />
              <button onClick={enviarMensagem} style={{ padding: '0 25px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontSize: '15px' }}>Selecione um atendimento para visualizar</div>
        )}
      </div>

      {/* 4. COLUNA DA DIREITA (DETALHES) - PROFISSIONAL WHITE */}
      {contatoParaDetalhar && (
        <div style={{ width: '360px', backgroundColor: '#fff', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', padding: '25px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '15px', backgroundColor: '#e8f0fe', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#1a73e8', fontWeight: 'bold' }}>{contatoParaDetalhar.name?.charAt(0)}</div>
            <h2 style={{ margin: '15px 0 5px 0', fontSize: '18px', color: '#202124', fontWeight: '700' }}>{contatoParaDetalhar.name}</h2>
            <p style={{ fontSize: '13px', color: '#70757a' }}>Cliente Ativo</p>
          </div>

          <div style={{ display: 'flex', gap: '20px', borderBottom: '2px solid #f1f3f4', marginBottom: '25px' }}>
            <span style={{ color: '#1a73e8', borderBottom: '2px solid #1a73e8', paddingBottom: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Detalhes</span>
            <span style={{ color: '#5f6368', paddingBottom: '10px', fontSize: '13px', cursor: 'pointer' }}>Notas</span>
          </div>

          <div style={estiloCampo}>
            <label style={{ color: '#5f6368', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>NOME COMPLETO</label>
            <input style={estiloInputWhite} defaultValue={contatoParaDetalhar.name} />
          </div>
          <div style={estiloCampo}>
            <label style={{ color: '#5f6368', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>E-MAIL</label>
            <input style={estiloInputWhite} defaultValue={contatoParaDetalhar.email || 'Não informado'} />
          </div>
          <div style={estiloCampo}>
            <label style={{ color: '#5f6368', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TELEFONE</label>
            <input style={estiloInputWhite} defaultValue={contatoParaDetalhar.phone_number || 'Não informado'} />
          </div>
          
          <button style={{ marginTop: '20px', backgroundColor: '#f1f3f4', color: '#3c4043', border: '1px solid #dadce0', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Atualizar Dados</button>
        </div>
      )}
    </div>
  );
};

const estiloInputWhite = { width: '100%', padding: '12px', backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#202124', marginTop: '6px', fontSize: '14px', outline: 'none' };
const estiloCampo = { marginBottom: '20px' };
const estiloTab = (ativo) => ({ flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#1a73e8' : '#f1f3f4', color: ativo ? '#fff' : '#5f6368', fontWeight: 'bold', transition: '0.2s' });

export default InboxPage;