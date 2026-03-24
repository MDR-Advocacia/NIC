import React, { useEffect, useMemo, useState } from 'react';

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
  const [enviandoTemplate, setEnviandoTemplate] = useState(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'https://api-nic-lab.mdradvocacia.com/api';

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

  const getTelefoneDestino = () => {
    const chatAtual = conversas.find((c) => c.id === conversaSelecionada);

    return (
      contatoParaDetalhar?.phone_number ||
      contatoParaDetalhar?.phoneNumber ||
      chatAtual?.meta?.sender?.phone_number ||
      chatAtual?.meta?.sender?.identifier ||
      ''
    );
  };

  const conversasOuContatos = useMemo(() => {
    if (visaoAtiva === 'conversas') return conversas;

    return contatos.filter((contato) =>
      contato.name?.toLowerCase().includes(buscaContato.toLowerCase())
    );
  }, [visaoAtiva, conversas, contatos, buscaContato]);

  const carregarDadosIniciais = async () => {
    const token = getCleanToken();

    try {
      const resInboxes = await fetch(`${API_BASE}/chat/inboxes`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const response = await resInboxes.json();
      setInboxes(extrairLista(response));

      const resContatos = await fetch(`${API_BASE}/chat/contacts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const dataContatos = await resContatos.json();
      setContatos(extrairLista(dataContatos));
    } catch (e) {
      console.error('Erro ao carregar dados iniciais:', e);
    }
  };

  const buscarConversas = (tipo) => {
    setCarregando(true);
    const token = getCleanToken();
    if (!token) return;

    let url = `${API_BASE}/chat/conversations?assignee_type=${tipo}`;
    if (inboxSelecionada && inboxSelecionada !== 'all') {
      url += `&inbox_id=${inboxSelecionada}`;
    }

    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((response) => {
        setConversas(extrairLista(response));
        setCarregando(false);
      })
      .catch((e) => {
        console.error('Erro ao buscar conversas:', e);
        setConversas([]);
        setCarregando(false);
      });
  };

  const carregarTemplates = async () => {
    const token = getCleanToken();
    const chatAtual = conversas.find((c) => c.id === conversaSelecionada);
    const inboxId = chatAtual?.inbox_id;

    if (!inboxId) {
      setTemplates([]);
      setErroTemplates('Selecione uma conversa valida para carregar templates.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/chat/templates?inbox_id=${inboxId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Erro ao carregar templates da Meta:', data);
        setTemplates([]);
        setErroTemplates(data?.hint || data?.message || 'Nao foi possivel carregar os templates desta inbox.');
        return;
      }

      setTemplates(extrairLista(data));
      setErroTemplates('');
    } catch (e) {
      console.error('Erro ao carregar templates da Meta:', e);
      setTemplates([]);
      setErroTemplates('Falha de comunicacao ao consultar templates da Meta.');
    }
  };

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

  const abrirConversa = (chatId) => {
    setConversaSelecionada(chatId);
    setCarregandoChat(true);
    setFeedbackEnvio('');
    const token = getCleanToken();

    fetch(`${API_BASE}/chat/conversations/${chatId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        const msgLista = extrairLista(data);
        setMensagens([...msgLista].sort((a, b) => a.id - b.id));
        setContatoParaDetalhar(data.data?.meta?.sender || data.meta?.sender || null);
        setCarregandoChat(false);
      })
      .catch(() => setCarregandoChat(false));
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;
    const token = getCleanToken();

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ content: novaMensagem }),
      });

      if (response.ok) {
        const enviada = await response.json();
        setMensagens((prev) => [...prev, enviada]);
        setNovaMensagem('');
        setFeedbackEnvio('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const enviarTemplateSelecionado = async (template) => {
    if (!conversaSelecionada || enviandoTemplate) return;

    const token = getCleanToken();
    const telefoneDestino = getTelefoneDestino();
    const chatAtual = conversas.find((c) => c.id === conversaSelecionada);

    setEnviandoTemplate(true);
    setFeedbackEnvio('');

    const payload = {
      content: '',
      message_type: 'outgoing',
      content_type: 'template',
      content_attributes: {
        template_name: template.name,
        language_code: template.language || 'pt_BR',
      },
      to_phone_number: telefoneDestino,
      inbox_id: chatAtual?.inbox_id || null,
    };

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setMensagens((prev) => [
          ...prev,
          {
            ...data,
            content: data.content || `[Template enviado] ${template.name}`,
            sender: data.sender || { name: 'NIC Agent' },
            message_type: data.message_type || 'outgoing',
            created_at: data.created_at || Math.floor(Date.now() / 1000),
          },
        ]);
        setMostrarTemplates(false);
        setFeedbackEnvio(`Template "${template.name}" enviado com sucesso.`);
      } else {
        console.error('Erro ao enviar template:', data);
        setFeedbackEnvio(data?.message || 'Nao foi possivel enviar o template selecionado.');
      }
    } catch (e) {
      console.error(e);
      setFeedbackEnvio('Falha de comunicacao ao enviar o template.');
    } finally {
      setEnviandoTemplate(false);
    }
  };

  const handlesubmitNovoContato = async (e) => {
    e.preventDefault();
    const token = getCleanToken();

    try {
      const response = await fetch(`${API_BASE}/chat/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(novoContato),
      });

      if (response.ok) {
        setModalAberto(false);
        setNovoContato({ name: '', email: '', phone_number: '', inbox_id: '' });
        carregarDadosIniciais();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const styles = {
    page: {
      display: 'grid',
      gridTemplateColumns: '320px 360px minmax(520px, 1fr)',
      height: 'calc(100vh - 40px)',
      margin: '-20px',
      background: 'linear-gradient(180deg, #f6f8fb 0%, #edf2f7 100%)',
      color: '#1f2937',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    },
    sidebar: {
      backgroundColor: '#ffffff',
      borderRight: '1px solid #d8e0eb',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    },
    sidebarInner: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      minHeight: 0,
      flex: 1,
    },
    brandCard: {
      padding: '20px',
      borderRadius: '18px',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2ff 100%)',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
    },
    agentCard: {
      padding: '18px',
      borderRadius: '18px',
      textAlign: 'center',
      fontWeight: 700,
      letterSpacing: '0.04em',
      color: '#1f4ed8',
      background: 'linear-gradient(135deg, #eef4ff 0%, #e0eaff 100%)',
      border: '1px solid #dbe6ff',
    },
    navItem: (ativo) => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 16px',
      borderRadius: '14px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '15px',
      color: ativo ? '#0f172a' : '#475569',
      background: ativo ? '#eef4ff' : 'transparent',
      border: ativo ? '1px solid #dbe6ff' : '1px solid transparent',
      transition: 'all 0.2s ease',
    }),
    middlePanel: {
      backgroundColor: '#fdfefe',
      borderRight: '1px solid #d8e0eb',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    },
    panelHeader: {
      padding: '24px',
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
    select: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '14px',
      border: '1px solid #d8e0eb',
      backgroundColor: '#fff',
      fontSize: '14px',
      outline: 'none',
      color: '#0f172a',
    },
    search: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '14px',
      border: '1px solid #d8e0eb',
      backgroundColor: '#fff',
      fontSize: '14px',
      outline: 'none',
      color: '#0f172a',
    },
    tabsRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '8px',
    },
    tab: (ativo) => ({
      padding: '10px 12px',
      borderRadius: '12px',
      border: '1px solid transparent',
      background: ativo ? '#2563eb' : '#f1f5f9',
      color: ativo ? '#ffffff' : '#475569',
      fontWeight: 700,
      fontSize: '13px',
      cursor: 'pointer',
    }),
    listArea: {
      flex: 1,
      overflowY: 'auto',
      padding: '10px 14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      backgroundColor: '#f8fafc',
    },
    listCard: (ativo) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px',
      borderRadius: '16px',
      border: ativo ? '1px solid #bfd4ff' : '1px solid #e2e8f0',
      backgroundColor: ativo ? '#eef4ff' : '#ffffff',
      boxShadow: ativo ? '0 14px 30px rgba(37, 99, 235, 0.10)' : '0 6px 20px rgba(15, 23, 42, 0.04)',
      cursor: 'pointer',
    }),
    avatar: (ativo) => ({
      width: '42px',
      height: '42px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      color: ativo ? '#1d4ed8' : '#475569',
      background: ativo ? '#dbeafe' : '#e2e8f0',
      flexShrink: 0,
    }),
    chatPanel: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%)',
    },
    chatHeader: {
      padding: '22px 28px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #d8e0eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.03)',
    },
    chatBody: {
      flex: 1,
      overflowY: 'auto',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      minHeight: 0,
    },
    bubbleWrap: (minha) => ({
      display: 'flex',
      flexDirection: minha ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '10px',
    }),
    bubble: (minha) => ({
      maxWidth: '72%',
      padding: '14px 16px',
      borderRadius: minha ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
      background: minha ? 'linear-gradient(135deg, #dcecff 0%, #cfe5ff 100%)' : '#ffffff',
      border: '1px solid #d8e0eb',
      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.04)',
    }),
    composer: {
      padding: '20px 24px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #d8e0eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    composerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative',
    },
    iconButton: {
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      border: '1px solid #d8e0eb',
      backgroundColor: '#f8fafc',
      cursor: 'pointer',
      fontSize: '18px',
      flexShrink: 0,
    },
    input: {
      flex: 1,
      padding: '14px 18px',
      borderRadius: '16px',
      border: '1px solid #d8e0eb',
      backgroundColor: '#f8fafc',
      outline: 'none',
      fontSize: '14px',
    },
    primaryButton: {
      padding: '14px 22px',
      borderRadius: '16px',
      border: 'none',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: '#ffffff',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 12px 22px rgba(37, 99, 235, 0.22)',
    },
    templatePopover: {
      position: 'absolute',
      bottom: '64px',
      left: 0,
      width: '320px',
      borderRadius: '18px',
      border: '1px solid #d8e0eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 22px 48px rgba(15, 23, 42, 0.16)',
      overflow: 'hidden',
      zIndex: 100,
    },
    feedbackBox: {
      padding: '10px 14px',
      borderRadius: '12px',
      backgroundColor: '#ecfdf3',
      color: '#166534',
      fontSize: '13px',
      border: '1px solid #bbf7d0',
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: '18px',
    },
    footerCard: {
      paddingTop: '18px',
      marginTop: 'auto',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
  };

  return (
    <div style={styles.page}>
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '22px', width: '420px', boxShadow: '0 26px 60px rgba(15, 23, 42, 0.20)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Novo Contato</h3>
            <form onSubmit={handlesubmitNovoContato}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>NOME</label>
                <input required style={styles.input} placeholder="Nome do cliente" value={novoContato.name} onChange={(e) => setNovoContato({ ...novoContato, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>TELEFONE</label>
                <input style={styles.input} placeholder="+55849..." value={novoContato.phone_number} onChange={(e) => setNovoContato({ ...novoContato, phone_number: e.target.value })} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>CANAL</label>
                <select required style={styles.select} value={novoContato.inbox_id} onChange={(e) => setNovoContato({ ...novoContato, inbox_id: e.target.value })}>
                  <option value="">Selecione o canal...</option>
                  {inboxes.map((ib) => (
                    <option key={ib.id} value={ib.id}>
                      {ib.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ ...styles.iconButton, width: '100%', fontSize: '14px', fontWeight: 700 }}>
                  Cancelar
                </button>
                <button type="submit" style={{ ...styles.primaryButton, width: '100%' }}>
                  Criar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <div style={styles.brandCard}>
            <img src="/logo.png" alt="NIC" style={{ maxWidth: '100%', height: 'auto' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-0.06em', color: '#0f172a' }}>NIC</div>
              <div style={{ width: '1px', height: '46px', backgroundColor: '#cbd5e1' }} />
              <div style={{ fontSize: '15px', lineHeight: 1.2, color: '#334155', fontWeight: 600 }}>
                Nucleo
                <br />
                Integrado de
                <br />
                Conciliacoes
              </div>
            </div>
          </div>

          <div style={styles.agentCard}>NIC AGENT</div>

          <div style={styles.navItem(visaoAtiva === 'conversas')} onClick={() => setVisaoAtiva('conversas')}>
            <span>Mensagens</span>
            <span style={{ color: '#2563eb' }}>◦</span>
          </div>

          <div style={styles.navItem(visaoAtiva === 'contatos')} onClick={() => setVisaoAtiva('contatos')}>
            <span>Contatos</span>
            <span onClick={(e) => { e.stopPropagation(); setModalAberto(true); }} style={{ color: '#22c55e', fontSize: '22px', fontWeight: 800 }}>
              +
            </span>
          </div>

          <div style={styles.footerCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '30px', fontWeight: 700, color: '#0f172a' }}>Murilo</div>
                <div style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Administrador</div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                ◐
              </div>
            </div>
            <button style={{ ...styles.iconButton, width: '100%', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={styles.middlePanel}>
        <div style={styles.panelHeader}>
          <select value={inboxSelecionada} onChange={(e) => setInboxSelecionada(e.target.value)} style={styles.select}>
            <option value="all">Todos os Canais</option>
            {inboxes.map((ib) => (
              <option key={ib.id} value={ib.id}>
                {ib.name}
              </option>
            ))}
          </select>

          {visaoAtiva === 'conversas' ? (
            <div style={styles.tabsRow}>
              <button onClick={() => setAbaAtiva('me')} style={styles.tab(abaAtiva === 'me')}>Minhas</button>
              <button onClick={() => setAbaAtiva('unassigned')} style={styles.tab(abaAtiva === 'unassigned')}>Nao atribuidas</button>
              <button onClick={() => setAbaAtiva('all')} style={styles.tab(abaAtiva === 'all')}>Todas</button>
            </div>
          ) : (
            <input type="text" placeholder="Pesquisar por nome..." value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} style={styles.search} />
          )}
        </div>

        <div style={styles.listArea}>
          {carregando ? (
            <div style={{ padding: '20px', color: '#64748b' }}>Carregando atendimentos...</div>
          ) : conversasOuContatos.length > 0 ? (
            conversasOuContatos.map((item) => {
              const nome = item.meta?.sender?.name || item.name || 'Sem Nome';
              const subtitulo = item.phone_number || item.meta?.sender?.phone_number || 'Ver conversa';
              const ativo = conversaSelecionada === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => (visaoAtiva === 'conversas' ? abrirConversa(item.id) : setContatoParaDetalhar(item))}
                  style={styles.listCard(ativo)}
                >
                  <div style={styles.avatar(ativo)}>{nome.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{nome}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitulo}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '20px', color: '#94a3b8' }}>Nenhum registro encontrado.</div>
          )}
        </div>
      </div>

      <div style={styles.chatPanel}>
        {conversaSelecionada ? (
          <>
            <div style={styles.chatHeader}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '20px', color: '#0f172a' }}>{contatoParaDetalhar?.name || 'Atendimento'}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{getTelefoneDestino() || 'Sem telefone identificado'}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}>
                WhatsApp
              </div>
            </div>

            <div style={styles.chatBody}>
              {carregandoChat ? (
                <div style={{ color: '#64748b' }}>Carregando conversa...</div>
              ) : mensagens.length > 0 ? (
                mensagens.map((m, i) => {
                  const eMinha = m.message_type === 'outgoing' || m.message_type === 1;
                  const iniciaisM = m.sender?.name?.charAt(0).toUpperCase() || 'C';

                  return (
                    <div key={i} style={styles.bubbleWrap(eMinha)}>
                      <div style={{ ...styles.avatar(eMinha), width: '34px', height: '34px', fontSize: '12px' }}>
                        {m.sender?.avatar_url ? <img src={m.sender.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" /> : iniciaisM}
                      </div>
                      <div style={styles.bubble(eMinha)}>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#0f172a' }}>{m.content || '[Template enviado]'}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                          {m.created_at ? new Date(m.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          {eMinha && <span>{m.status === 'read' ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#94a3b8' }}>Nenhuma mensagem encontrada para este atendimento.</div>
              )}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            <div style={styles.composer}>
              {feedbackEnvio ? <div style={styles.feedbackBox}>{feedbackEnvio}</div> : null}

              <div style={styles.composerRow}>
                <button
                  onClick={() => {
                    setMostrarTemplates(!mostrarTemplates);
                    if (!mostrarTemplates) carregarTemplates();
                    if (mostrarTemplates) setErroTemplates('');
                  }}
                  style={styles.iconButton}
                  title="Abrir templates"
                >
                  📋
                </button>

                {mostrarTemplates && (
                  <div style={styles.templatePopover}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                      Templates Meta (WhatsApp)
                    </div>
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {erroTemplates ? (
                        <div style={{ padding: '14px 16px', fontSize: '12px', color: '#b91c1c', lineHeight: 1.6 }}>{erroTemplates}</div>
                      ) : templates.length > 0 ? (
                        templates.map((t) => {
                          const corpo = getTextoTemplate(t);

                          return (
                            <div
                              key={t.id || t.name}
                              onClick={() => enviarTemplateSelecionado(t)}
                              style={{ padding: '14px 16px', cursor: enviandoTemplate ? 'wait' : 'pointer', borderBottom: '1px solid #eef2f7', opacity: enviandoTemplate ? 0.6 : 1 }}
                            >
                              <strong style={{ color: '#1d4ed8', display: 'block', fontSize: '13px', marginBottom: '4px' }}>{t.name}</strong>
                              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', lineHeight: 1.5 }}>
                                {corpo.length > 72 ? `${corpo.substring(0, 72)}...` : corpo}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '14px 16px', fontSize: '12px', lineHeight: 1.5, color: '#64748b' }}>
                          Nenhum template aprovado. Clique em "Sincronizar Modelos" no Chatwoot.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()}
                  placeholder="Digite uma mensagem..."
                  style={styles.input}
                />
                <button onClick={enviarMensagem} style={styles.primaryButton}>
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>Selecione um atendimento para abrir o chat.</div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
