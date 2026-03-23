import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('me');
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [novoContato, setNovoContato] = useState({ name: '', email: '', phone_number: '', inbox_id: '' });
  const [inboxes, setInboxes] = useState([]);
  const [inboxSelecionada, setInboxSelecionada] = useState('all');
  const [visaoAtiva, setVisaoAtiva] = useState('conversas'); 
  const [contatos, setContatos] = useState([]);
  const [buscaContato, setBuscaContato] = useState('');
  const [contatoParaDetalhar, setContatoParaDetalhar] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [erroTemplates, setErroTemplates] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || "https://api-nic-lab.mdradvocacia.com/api";

  // Helper para pegar token limpo
  const getCleanToken = () => {
    const token = localStorage.getItem('authToken');
    return token ? token.replace(/"/g, '').trim() : null;
  };

  const extrairLista = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.payload)) return response.payload;
    if (Array.isArray(response?.data?.payload)) return response.data.payload;
    return [];
  };

  const getTextoTemplate = (template) => {
    if (template?.body_text) return template.body_text;

    const bodyComponent = template?.components?.find(
      (component) => String(component?.type || '').toUpperCase() === 'BODY'
    );

    return bodyComponent?.text || 'Template da Meta';
  };

  // 1. CARREGAR DADOS INICIAIS (Canais e Contatos)
  const carregarDadosIniciais = async () => {
    const token = getCleanToken();
    try {
      const resInboxes = await fetch(`${API_BASE}/chat/inboxes`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const response = await resInboxes.json();
      // Ajuste de mapeamento para Inboxes
      const listaInboxes = extrairLista(response);
      setInboxes(listaInboxes);

      const resContatos = await fetch(`${API_BASE}/chat/contacts`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const dataContatos = await resContatos.json();
      const listaContatos = extrairLista(dataContatos);
      setContatos(listaContatos);
    } catch (e) {
      console.error("Erro ao carregar dados iniciais:", e);
    }
  };

  // 2. BUSCAR CONVERSAS (Com filtro de Inbox)
  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = getCleanToken();
    if (!token) return;

    let url = `${API_BASE}/chat/conversations?assignee_type=${tipo}`;
    if (inboxSelecionada && inboxSelecionada !== 'all') {
      url += `&inbox_id=${inboxSelecionada}`;
    }

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(response => {
      // CORREÇÃO: Mapeia o caminho response.data.payload vindo do Laravel
      const listaExtraida = extrairLista(response);
      setConversas(Array.isArray(listaExtraida) ? listaExtraida : []);
      setCarregando(false);
    })
    .catch(e => {
      console.error("Erro ao buscar conversas:", e);
      setConversas([]);
      setCarregando(false);
    });
  };

  // 3. CARREGAR TEMPLATES (Agora buscando os 100+ configurados no Controller)
  const carregarTemplates = async () => {
    const token = getCleanToken();
    const chatAtual = conversas.find(c => c.id === conversaSelecionada);
    const inboxId = chatAtual?.inbox_id;

    if (!inboxId) {
      setTemplates([]);
      setErroTemplates('A conversa selecionada nao possui inbox compativel para carregar templates.');
      return;
    }

    try {
        const res = await fetch(`${API_BASE}/chat/templates?inbox_id=${inboxId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        const data = await res.json();

        if (!res.ok) {
          console.error("Erro ao carregar templates da Meta:", data);
          setTemplates([]);
          setErroTemplates(data?.hint || data?.message || 'Nao foi possivel carregar os templates desta inbox.');
          return;
        }

        setTemplates(extrairLista(data));
        setErroTemplates('');
    } catch (e) {
        console.error("Erro ao carregar templates da Meta:", e);
        setTemplates([]);
        setErroTemplates('Falha de comunicacao ao consultar templates da Meta.');
    }
};

  // --- USE EFFECTS DE CONTROLE ---
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    buscarConversas(abaAtiva);
  }, [abaAtiva, inboxSelecionada]);

  useEffect(() => {
    if (conversaSelecionada) {
      carregarTemplates();
    }
  }, [conversaSelecionada]);

  // --- FUNÇÕES DE AÇÃO ---

  const abrirConversa = (chatId) => {
    setConversaSelecionada(chatId);
    setCarregandoChat(true);
    const token = getCleanToken();
    
    fetch(`${API_BASE}/chat/conversations/${chatId}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      const msgLista = extrairLista(data);
      setMensagens([...msgLista].sort((a, b) => a.id - b.id));
      setContatoParaDetalhar(data.data?.meta?.sender || data.meta?.sender || null);
      setCarregandoChat(false);
    }).catch(() => setCarregandoChat(false));
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;
    const token = getCleanToken();
    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
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
        setMensagens(prev => [...prev, enviada]); 
        setNovaMensagem(''); 
      }
    } catch (e) { console.error(e); }
  };

  const enviarTemplateSelecionado = async (template) => {
  if (!conversaSelecionada) return;
  const token = getCleanToken();

  // O payload para Meta PRECISA ser assim para não dar erro 422
  const payload = {
    content: "", // Meta ignora o content se for template oficial
    message_type: "outgoing",
    content_type: "template",
    content_attributes: {
      template_name: template.name,
      language_code: template.language || "pt_BR"
    }
  };

  try {
    const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setMostrarTemplates(false);
      abrirConversa(conversaSelecionada);
    } else {
      const erro = await response.json();
      console.error("Erro Meta 422:", erro);
    }
  } catch (e) {
    console.error(e);
  }
};

  const handlesubmitNovoContato = async (e) => {
    e.preventDefault();
    const token = getCleanToken();
    try {
      const response = await fetch(`${API_BASE}/chat/contacts`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(novoContato)
      });
      if (response.ok) {
        setModalAberto(false);
        setNovoContato({ name: '', email: '', phone_number: '', inbox_id: '' });
        carregarDadosIniciais();
        alert("Contato criado!");
      }
    } catch (error) { console.error(error); }
  };

  // Estilos
  const estiloInputWhite = { width: '100%', padding: '12px', backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '6px', fontSize: '14px', outline: 'none' };
  const estiloCampo = { marginBottom: '20px' };
  const estiloTab = (ativo) => ({ flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', backgroundColor: ativo ? '#1a73e8' : '#f1f3f4', color: ativo ? '#fff' : '#5f6368', fontWeight: 'bold' });

  return (
    <div style={{ display: 'flex', height: '88vh', backgroundColor: '#f8f9fa', margin: '-20px', fontFamily: 'Inter, sans-serif' }}>
      
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#202124' }}>Novo Contato</h3>
            <form onSubmit={handlesubmitNovoContato}>
              <div style={estiloCampo}>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#5f6368'}}>NOME</label>
                <input required style={estiloInputWhite} placeholder="Nome do cliente" value={novoContato.name} onChange={e => setNovoContato({...novoContato, name: e.target.value})} />
              </div>
              <div style={estiloCampo}>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#5f6368'}}>TELEFONE</label>
                <input style={estiloInputWhite} placeholder="+55849..." value={novoContato.phone_number} onChange={e => setNovoContato({...novoContato, phone_number: e.target.value})} />
              </div>
              <div style={estiloCampo}>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#5f6368'}}>CANAL (INBOX)</label>
                <select required style={estiloInputWhite} value={novoContato.inbox_id} onChange={e => setNovoContato({...novoContato, inbox_id: e.target.value})}>
                  <option value="">Selecione o canal...</option>
                  {inboxes.map(ib => <option key={ib.id} value={ib.id}>{ib.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Criar Contato</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div style={{ width: '240px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', padding: '15px' }}>
        <div style={{ fontWeight: '800', color: '#1a73e8', marginBottom: '25px', padding: '12px', backgroundColor: '#f0f4ff', borderRadius: '10px', fontSize: '14px', textAlign: 'center' }}>
          NIC AGENT
        </div>
        <div onClick={() => setVisaoAtiva('conversas')} style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: visaoAtiva === 'conversas' ? '#f1f3f4' : 'transparent', color: visaoAtiva === 'conversas' ? '#1a73e8' : '#5f6368', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>💬 Mensagens</div>
        <div onClick={() => setVisaoAtiva('contatos')} style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: visaoAtiva === 'contatos' ? '#f1f3f4' : 'transparent', color: visaoAtiva === 'contatos' ? '#1a73e8' : '#5f6368', fontWeight: '600', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          👥 Contatos
          <span onClick={(e) => { e.stopPropagation(); setModalAberto(true); }} style={{ color: '#25D366', fontWeight: 'bold', fontSize: '18px', padding: '0 5px' }}>+</span>
        </div>
      </div>
      
      <div style={{ width: '380px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <select value={inboxSelecionada} onChange={(e) => setInboxSelecionada(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #dcdcdc', backgroundColor: '#f9f9f9', outline: 'none', fontSize: '13px' }}>
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
              const nome = item.meta?.sender?.name || item.name || "Sem Nome";
              const iniciais = nome.charAt(0).toUpperCase();
              return (
                <div key={item.id} onClick={() => visaoAtiva === 'conversas' ? abrirConversa(item.id) : setContatoParaDetalhar(item)} style={{ padding: '15px 20px', borderBottom: '1px solid #f8f8f8', cursor: 'pointer', backgroundColor: (conversaSelecionada === item.id) ? '#e8f0fe' : '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dadce0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#5f6368', flexShrink: 0 }}>{iniciais}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#202124' }}>{nome}</div>
                    <div style={{ fontSize: '12px', color: '#70757a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.phone_number || "Ver chat"}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
        {conversaSelecionada ? (
          <>
            <div style={{ padding: '15px 25px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#202124' }}>{contatoParaDetalhar?.name}</span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column' }}>
              {mensagens.map((m, i) => {
                const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
                const iniciaisM = m.sender?.name?.charAt(0).toUpperCase() || "C";
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: eMinha ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '15px', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: eMinha ? '#1a73e8' : '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                      {m.sender?.avatar_url ? <img src={m.sender.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" /> : iniciaisM}
                    </div>
                    <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '12px', backgroundColor: eMinha ? '#e3f2fd' : '#fff', border: '1px solid #e0e0e0' }}>
                      <p style={{ margin: 0, fontSize: '14px' }}>{m.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '10px', color: '#80868b' }}>
                        {new Date(m.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {eMinha && <span>{m.status === 'read' ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            <div style={{ padding: '20px', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '12px', position: 'relative' }}>
              <button 
                onClick={() => {
                  setMostrarTemplates(!mostrarTemplates);
                  if (!mostrarTemplates) carregarTemplates();
                  if (mostrarTemplates) setErroTemplates('');
                }} 
                style={{ padding: '0 15px', backgroundColor: '#f1f3f4', border: '1px solid #dadce0', borderRadius: '30px', cursor: 'pointer', fontSize: '18px' }}
              >
                📋
              </button>
              {mostrarTemplates && (
  <div style={{ position: 'absolute', bottom: '80px', left: '20px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', width: '280px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 100 }}>
    <div style={{ padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', fontSize: '13px', backgroundColor: '#f8f9fa', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
      Templates Meta (WhatsApp)
    </div>
    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
      {erroTemplates ? (
        <div style={{ padding: '12px', fontSize: '12px', color: '#b3261e', lineHeight: 1.5 }}>
          {erroTemplates}
        </div>
      ) : templates.length > 0 ? templates.map(t => {
    const corpo = getTextoTemplate(t);

    return (
        <div 
            key={t.id || t.name} 
            onClick={() => enviarTemplateSelecionado(t)} 
            style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
        >
            <strong style={{ color: '#1a73e8', display: 'block', fontSize: '13px' }}>
                {t.name} {/* Aqui vai aparecer 'recbb_megafeira_cor', etc */}
            </strong>
            <span style={{ fontSize: '11px', color: '#5f6368', display: 'block' }}>
                {corpo.length > 50 ? `${corpo.substring(0, 50)}...` : corpo}
            </span>
        </div>
    );
}) : <div style={{ padding: '12px', fontSize: '12px', lineHeight: 1.5 }}>Nenhum template aprovado. Clique em "Sincronizar Modelos" no Chatwoot.</div>}

    </div>
  </div>
)}

              <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()} placeholder="Mensagem..." style={{ flex: 1, padding: '12px 18px', borderRadius: '30px', border: '1px solid #dadce0', backgroundColor: '#f1f3f4', outline: 'none' }} />
              <button onClick={enviarMensagem} style={{ padding: '0 25px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6' }}>Selecione um atendimento</div>
        )}
       
      </div>
    </div>
  );
};

export default InboxPage;
