import React, { useEffect, useMemo, useRef, useState } from 'react';

const styles = {
  page: {
    display: 'grid',
    gridTemplateColumns: '220px 360px minmax(0, 1fr)',
    height: 'calc(100dvh - 40px)',
    margin: '-20px',
    backgroundColor: '#f3f6fb',
    color: '#10233f',
    overflow: 'hidden',
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  },
  rail: {
    backgroundColor: '#ffffff',
    borderRight: '1px solid #dbe3ee',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    minHeight: 0,
    overflowY: 'auto',
  },
  railTitle: { margin: '6px 0 0', fontSize: '26px', fontWeight: 800, lineHeight: 1.1 },
  railKicker: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5f7291' },
  railSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  railButton: (active) => ({
    padding: '14px 16px',
    borderRadius: '14px',
    border: active ? '1px solid #c7d8fb' : '1px solid #dbe3ee',
    backgroundColor: active ? '#eaf1ff' : '#fff',
    color: active ? '#1d4ed8' : '#213656',
    fontWeight: 700,
    fontSize: '14px',
    textAlign: 'left',
    cursor: 'pointer',
  }),
  addButton: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  railHint: {
    marginTop: 'auto',
    padding: '16px',
    borderRadius: '18px',
    backgroundColor: '#eaf1ff',
    border: '1px solid #d7e5ff',
  },
  railHintLabel: { fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5f7291' },
  railHintValue: { marginTop: '8px', fontSize: '15px', fontWeight: 700, lineHeight: 1.4, color: '#10233f' },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fbfcfe',
    borderRight: '1px solid #dbe3ee',
    minHeight: 0,
  },
  panelHeader: {
    padding: '22px',
    borderBottom: '1px solid #dbe3ee',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid #dbe3ee',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#10233f',
    outline: 'none',
  },
  search: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid #dbe3ee',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#10233f',
    outline: 'none',
  },
  tabs: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  tab: (active) => ({
    padding: '11px 10px',
    borderRadius: '12px',
    border: '1px solid transparent',
    backgroundColor: active ? '#2563eb' : '#eef2f8',
    color: active ? '#fff' : '#54657f',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  }),
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listCard: (active) => ({
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '14px',
    borderRadius: '16px',
    border: active ? '1px solid #c7d8fb' : '1px solid #dbe3ee',
    backgroundColor: active ? '#edf3ff' : '#fff',
    boxShadow: active ? '0 14px 28px rgba(37, 99, 235, 0.10)' : '0 8px 18px rgba(16, 35, 63, 0.04)',
    cursor: 'pointer',
  }),
  avatar: (active) => ({
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? '#dbeafe' : '#e7edf5',
    color: active ? '#1d4ed8' : '#54657f',
    fontWeight: 700,
    flexShrink: 0,
  }),
  chat: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    background: 'linear-gradient(180deg, #f9fbff 0%, #edf2f8 100%)',
  },
  chatHeader: {
    padding: '22px 28px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #dbe3ee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '10px 14px',
    borderRadius: '999px',
    backgroundColor: '#eef4ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '12px',
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
  messageRow: (mine) => ({
    display: 'flex',
    flexDirection: mine ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    gap: '10px',
  }),
  bubble: (mine) => ({
    maxWidth: '72%',
    padding: '14px 16px',
    borderRadius: mine ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
    backgroundColor: mine ? '#dbeafe' : '#ffffff',
    border: '1px solid #dbe3ee',
    boxShadow: '0 8px 18px rgba(16, 35, 63, 0.05)',
  }),
  attachmentCard: {
    marginBottom: '10px',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid #dbe3ee',
    backgroundColor: '#fff',
  },
  imageAttachment: {
    display: 'block',
    width: '100%',
    maxHeight: '320px',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  documentLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none',
  },
  audioPlayer: {
    width: '100%',
    display: 'block',
  },
  statusTag: (status) => ({
    padding: '3px 8px',
    borderRadius: '999px',
    backgroundColor:
      status === 'failed' ? '#fee2e2'
      : status === 'read' ? '#dcfce7'
      : status === 'delivered' ? '#dbeafe'
      : '#eef2f7',
    color:
      status === 'failed' ? '#b42318'
      : status === 'read' ? '#166534'
      : status === 'delivered' ? '#1d4ed8'
      : '#5f7291',
    fontWeight: 700,
    fontSize: '11px',
  }),
  composer: {
    padding: '18px 24px 22px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #dbe3ee',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  composerRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  secondaryButton: {
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid #dbe3ee',
    backgroundColor: '#f8fbff',
    color: '#213656',
    fontWeight: 700,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid #dbe3ee',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#10233f',
    outline: 'none',
  },
  composerInput: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid #dbe3ee',
    backgroundColor: '#f8fbff',
    fontSize: '14px',
    color: '#10233f',
    outline: 'none',
  },
  primaryButton: {
    padding: '14px 24px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  feedback: (type) => ({
    padding: '11px 14px',
    borderRadius: '12px',
    border: type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
    backgroundColor: type === 'error' ? '#fff1f2' : '#ecfdf3',
    color: type === 'error' ? '#b42318' : '#166534',
    fontSize: '13px',
    lineHeight: 1.5,
  }),
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#6b7d96',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(6, 17, 34, 0.52)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    zIndex: 9999,
  },
};

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
  const [erroTemplates, setErroTemplates] = useState('');
  const [modalTemplatesAberto, setModalTemplatesAberto] = useState(false);
  const [carregandoTemplates, setCarregandoTemplates] = useState(false);
  const [buscaTemplate, setBuscaTemplate] = useState('');
  const [templateSelecionado, setTemplateSelecionado] = useState(null);
  const [variaveisTemplate, setVariaveisTemplate] = useState({});
  const [enviandoTemplate, setEnviandoTemplate] = useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState('');
  const [tipoFeedback, setTipoFeedback] = useState('success');
  const [imagemAberta, setImagemAberta] = useState(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const knownActivityRef = useRef(new Map());
  const notificacoesInicializadasRef = useRef(false);

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
    const bodyComponent = template?.components?.find((component) => String(component?.type || '').toUpperCase() === 'BODY');
    return bodyComponent?.text || 'Template da Meta';
  };

  const extrairVariaveisTemplate = (template) => {
    const textos = [template?.body_text, ...(template?.components || []).map((component) => component?.text)].filter(Boolean);
    const encontradas = new Set();

    textos.forEach((texto) => {
      const regex = /\{\{(\d+)\}\}/g;
      let match = regex.exec(texto);

      while (match) {
        encontradas.add(Number(match[1]));
        match = regex.exec(texto);
      }
    });

    return Array.from(encontradas).sort((left, right) => left - right);
  };

  const formatarPreviewTemplate = (template, valores = {}) =>
    getTextoTemplate(template).replace(/\{\{(\d+)\}\}/g, (_, indice) => valores[indice]?.trim() || `{{${indice}}}`);

  const formatarHorario = (createdAt) => {
    if (!createdAt) return '--:--';

    if (typeof createdAt === 'number') {
      const normalized = createdAt > 9999999999 ? createdAt : createdAt * 1000;
      return new Date(normalized).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusMensagem = (status) => {
    const mapa = {
      sent: 'Enviado',
      delivered: 'Entregue',
      read: 'Lido',
      failed: 'Falhou',
      pending: 'Enviando',
    };

    return mapa[status] || 'Enviado';
  };

  const getConteudoVisivelMensagem = (mensagem) => {
    if (mensagem?.content && mensagem.content.trim()) {
      return mensagem.content.trim();
    }

    if (mensagem?.content_type === 'template') {
      const atributos = mensagem?.content_attributes || {};
      const corpoTemplate =
        atributos.processed_message_content ||
        atributos.template_message ||
        atributos.template_body ||
        atributos.message ||
        '';

      if (typeof corpoTemplate === 'string' && corpoTemplate.trim()) {
        return corpoTemplate.trim();
      }

      const nomeTemplate =
        atributos.template_name ||
        atributos.name ||
        mensagem?.template_params?.name ||
        'template';

      return `Template enviado: ${nomeTemplate}`;
    }

    return '';
  };

  const formatarHorarioConversa = (timestamp) => {
    if (!timestamp) return '';

    const data = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    if (Number.isNaN(data.getTime())) return '';

    return data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessagePreview = (mensagem) => {
    if (!mensagem) return 'Nenhuma mensagem ainda';

    const anexos = getMessageAttachments(mensagem);
    const conteudoVisivel = getConteudoVisivelMensagem(mensagem);

    if (conteudoVisivel) {
      return conteudoVisivel;
    }

    if (anexos.length > 0) {
      const tipo = anexos[0]?.file_type || 'file';
      const mapa = {
        image: 'Imagem enviada',
        audio: 'Audio enviado',
        video: 'Video enviado',
        file: 'Arquivo enviado',
      };

      return mapa[tipo] || 'Midia enviada';
    }

    if (mensagem.content_type === 'template') {
      return 'Template do WhatsApp';
    }

    return 'Nova mensagem';
  };

  const getConversationPreview = (conversa) => {
    const ultimaMensagem = conversa?.last_non_activity_message || conversa?.messages?.[0] || null;
    return getMessagePreview(ultimaMensagem);
  };

  const getMessageAttachments = (mensagem) => {
    if (Array.isArray(mensagem?.attachments)) return mensagem.attachments.filter(Boolean);
    if (Array.isArray(mensagem?.attachment)) return mensagem.attachment.filter(Boolean);
    if (mensagem?.attachment) return [mensagem.attachment];
    return [];
  };

  const getAttachmentUrl = (attachment) =>
    attachment?.data_url || attachment?.download_url || attachment?.external_url || attachment?.file_url || attachment?.thumb_url || '';

  const detectarTipoArquivo = (arquivo) => {
    const mime = arquivo?.type || '';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    return 'file';
  };

  const normalizarMensagemRetorno = (mensagem, fallback = {}) => ({
    ...mensagem,
    content: mensagem?.content ?? fallback.content ?? '',
    sender: mensagem?.sender || fallback.sender || { name: 'NIC Agent' },
    message_type: mensagem?.message_type || fallback.message_type || 'outgoing',
    created_at: mensagem?.created_at || fallback.created_at || Math.floor(Date.now() / 1000),
    status: mensagem?.status || fallback.status || 'sent',
    attachments: getMessageAttachments(mensagem).length > 0 ? getMessageAttachments(mensagem) : fallback.attachments || [],
  });

  const conversaAtual = useMemo(
    () => conversas.find((conversa) => conversa.id === conversaSelecionada) || null,
    [conversas, conversaSelecionada]
  );

  const telefoneDestino = useMemo(
    () =>
      contatoParaDetalhar?.phone_number ||
      contatoParaDetalhar?.phoneNumber ||
      conversaAtual?.meta?.sender?.phone_number ||
      conversaAtual?.meta?.sender?.identifier ||
      '',
    [conversaAtual, contatoParaDetalhar]
  );

  const registrosVisiveis = useMemo(() => {
    if (visaoAtiva === 'conversas') return conversas;
    return contatos.filter((contato) => (contato?.name || '').toLowerCase().includes(buscaContato.toLowerCase()));
  }, [visaoAtiva, conversas, contatos, buscaContato]);

  const templatesFiltrados = useMemo(
    () => templates.filter((template) => template?.name?.toLowerCase().includes(buscaTemplate.toLowerCase())),
    [templates, buscaTemplate]
  );

  const variaveisDetectadas = useMemo(
    () => (templateSelecionado ? extrairVariaveisTemplate(templateSelecionado) : []),
    [templateSelecionado]
  );

  const variaveisPendentes = useMemo(
    () => variaveisDetectadas.filter((indice) => !(variaveisTemplate[indice] || '').trim()),
    [variaveisDetectadas, variaveisTemplate]
  );

  const definirFeedback = (mensagem, tipo = 'success') => {
    setFeedbackEnvio(mensagem);
    setTipoFeedback(tipo);
  };

  const carregarDadosIniciais = async () => {
    const token = getCleanToken();

    try {
      const resInboxes = await fetch(`${API_BASE}/chat/inboxes`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const dataInboxes = await resInboxes.json();
      setInboxes(extrairLista(dataInboxes));

      const resContatos = await fetch(`${API_BASE}/chat/contacts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const dataContatos = await resContatos.json();
      setContatos(extrairLista(dataContatos));
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const buscarConversas = async (tipo, options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setCarregando(true);
    }

    const token = getCleanToken();
    if (!token) return [];

    let url = `${API_BASE}/chat/conversations?assignee_type=${tipo}`;
    if (inboxSelecionada && inboxSelecionada !== 'all') {
      url += `&inbox_id=${inboxSelecionada}`;
    }

    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const data = await response.json();
      const lista = extrairLista(data);

      setConversas(lista);
      return lista;
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      if (!silent) {
        setConversas([]);
      }
      return [];
    } finally {
      if (!silent) {
        setCarregando(false);
      }
    }
  };

  const prepararTemplate = (template) => {
    const indices = extrairVariaveisTemplate(template);
    setTemplateSelecionado(template);
    setVariaveisTemplate((anterior) => {
      const proximo = {};
      indices.forEach((indice) => {
        proximo[indice] = anterior[indice] || '';
      });
      return proximo;
    });
  };

  const carregarTemplates = async () => {
    const token = getCleanToken();
    const inboxId = conversaAtual?.inbox_id;

    if (!inboxId) {
      setTemplates([]);
      setErroTemplates('Selecione uma conversa valida para carregar templates.');
      return;
    }

    try {
      setCarregandoTemplates(true);
      const res = await fetch(`${API_BASE}/chat/templates?inbox_id=${inboxId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Erro ao carregar templates da Meta:', data);
        setTemplates([]);
        setTemplateSelecionado(null);
        setErroTemplates(data?.hint || data?.message || 'Nao foi possivel carregar os templates desta inbox.');
        return;
      }

      const lista = extrairLista(data);
      setTemplates(lista);
      setErroTemplates('');

      if (lista.length > 0) {
        prepararTemplate(lista[0]);
      } else {
        setTemplateSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao carregar templates da Meta:', error);
      setTemplates([]);
      setTemplateSelecionado(null);
      setErroTemplates('Falha de comunicacao ao consultar templates da Meta.');
    } finally {
      setCarregandoTemplates(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    buscarConversas(abaAtiva);
  }, [abaAtiva, inboxSelecionada]);

  useEffect(() => {
    const intervaloConversas = window.setInterval(async () => {
      const lista = await buscarConversas(abaAtiva, { silent: true });

      if (!lista.length) {
        return;
      }

      const totalNaoLidas = lista.reduce((total, conversa) => total + Number(conversa?.unread_count || 0), 0);
      document.title = totalNaoLidas > 0 ? `(${totalNaoLidas}) NIC` : 'NIC';

      const novasAtividades = [];

      lista.forEach((conversa) => {
        const ultimoId = conversa?.last_non_activity_message?.id || conversa?.last_non_activity_message?.source_id || conversa?.timestamp || conversa?.updated_at;
        const chave = String(conversa.id);
        const ultimoRegistrado = knownActivityRef.current.get(chave);

        if (ultimoId) {
          knownActivityRef.current.set(chave, ultimoId);
        }

        if (!notificacoesInicializadasRef.current || !ultimoId || !ultimoRegistrado || ultimoRegistrado === ultimoId) {
          return;
        }

        if (Number(conversa?.unread_count || 0) > 0) {
          novasAtividades.push(conversa);
        }
      });

      if (!notificacoesInicializadasRef.current) {
        notificacoesInicializadasRef.current = true;
      }

      novasAtividades.forEach((conversa) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(conversa?.meta?.sender?.name || conversa?.contact_inbox?.contact?.name || 'Nova mensagem', {
            body: getConversationPreview(conversa),
            tag: `nic-conversa-${conversa.id}`,
          });
        }
      });
    }, 8000);

    return () => {
      window.clearInterval(intervaloConversas);
      document.title = 'NIC';
    };
  }, [abaAtiva, inboxSelecionada]);

  useEffect(() => {
    if (!conversaSelecionada) {
      return undefined;
    }

    const intervaloMensagens = window.setInterval(() => {
      carregarMensagensConversa(conversaSelecionada, { silent: true });
    }, 5000);

    return () => window.clearInterval(intervaloMensagens);
  }, [conversaSelecionada]);

  useEffect(() => {
    setModalTemplatesAberto(false);
    setTemplateSelecionado(null);
    setVariaveisTemplate({});
    setBuscaTemplate('');
    setErroTemplates('');
  }, [conversaSelecionada]);

  const carregarMensagensConversa = async (chatId, options = {}) => {
    const silent = options.silent === true;
    const token = getCleanToken();

    if (!silent) {
      setCarregandoChat(true);
    }

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${chatId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await response.json();
      const msgLista = extrairLista(data);
      setMensagens([...msgLista].sort((left, right) => left.id - right.id));
      setContatoParaDetalhar(data.data?.meta?.sender || data.meta?.sender || null);
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    } finally {
      if (!silent) {
        setCarregandoChat(false);
      }
    }
  };

  const abrirConversa = (chatId) => {
    setConversaSelecionada(chatId);
    setFeedbackEnvio('');
    carregarMensagensConversa(chatId);
  };

  const abrirModalTemplates = async () => {
    if (!conversaSelecionada) return;
    setModalTemplatesAberto(true);
    setBuscaTemplate('');
    await carregarTemplates();
  };

  const abrirSeletorArquivo = (tipo) => {
    if (tipo === 'audio') {
      audioInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  };

  const enviarArquivos = async (arquivos, tipoForcado = null) => {
    if (!conversaSelecionada || !arquivos?.length || enviandoArquivo) return;

    const token = getCleanToken();
    const formData = new FormData();
    const tipoArquivo = tipoForcado || detectarTipoArquivo(arquivos[0]);

    formData.append('content', novaMensagem.trim());
    formData.append('file_type', tipoArquivo);
    arquivos.forEach((arquivo) => formData.append('attachments[]', arquivo));

    try {
      setEnviandoArquivo(true);

      const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMensagens((anterior) => [
          ...anterior,
          normalizarMensagemRetorno(data, {
            content: novaMensagem.trim(),
            attachments: arquivos.map((arquivo) => ({
              file_type: detectarTipoArquivo(arquivo),
              data_url: URL.createObjectURL(arquivo),
            })),
          }),
        ]);
        setNovaMensagem('');
        definirFeedback('Arquivo enviado com sucesso.');
      } else {
        console.error('Erro ao enviar arquivo:', data);
        definirFeedback(data?.message || 'Nao foi possivel enviar o arquivo.', 'error');
      }
    } catch (error) {
      console.error(error);
      definirFeedback('Falha de comunicacao ao enviar o arquivo.', 'error');
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const handleArquivoSelecionado = async (event, tipoForcado = null) => {
    const arquivos = Array.from(event.target.files || []);
    event.target.value = '';

    if (arquivos.length === 0) {
      return;
    }

    await enviarArquivos(arquivos, tipoForcado);
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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMensagens((anterior) => [...anterior, normalizarMensagemRetorno(data, { content: novaMensagem.trim() })]);
        setNovaMensagem('');
        setFeedbackEnvio('');
      } else {
        definirFeedback(data?.message || 'Nao foi possivel enviar a mensagem.', 'error');
      }
    } catch (error) {
      console.error(error);
      definirFeedback('Falha de comunicacao ao enviar a mensagem.', 'error');
    }
  };

  const enviarTemplateSelecionado = async () => {
    if (!conversaSelecionada || !templateSelecionado || enviandoTemplate) return;

    if (variaveisPendentes.length > 0) {
      definirFeedback('Preencha todas as variaveis do template antes de enviar.', 'error');
      return;
    }

    const token = getCleanToken();
    const bodyParams = variaveisDetectadas.reduce((accumulator, indice) => {
      accumulator[String(indice)] = (variaveisTemplate[indice] || '').trim();
      return accumulator;
    }, {});

    const payload = {
      content: formatarPreviewTemplate(templateSelecionado, variaveisTemplate),
      message_type: 'outgoing',
      content_type: 'template',
      content_attributes: {
        template_name: templateSelecionado.name,
        language_code: templateSelecionado.language || 'pt_BR',
      },
      template_params: {
        name: templateSelecionado.name,
        category: templateSelecionado.category || 'UTILITY',
        language: templateSelecionado.language || 'pt_BR',
        processed_params: {
          body: bodyParams,
        },
      },
      to_phone_number: telefoneDestino,
      inbox_id: conversaAtual?.inbox_id || null,
    };

    try {
      setEnviandoTemplate(true);

      const response = await fetch(`${API_BASE}/chat/conversations/${conversaSelecionada}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMensagens((anterior) => [
          ...anterior,
          normalizarMensagemRetorno(data, { content: payload.content }),
        ]);
        setModalTemplatesAberto(false);
        definirFeedback(`Template "${templateSelecionado.name}" enviado com sucesso.`);
      } else {
        console.error('Erro ao enviar template:', data);
        definirFeedback(data?.message || data?.meta_error?.error?.message || 'Nao foi possivel enviar o template.', 'error');
      }
    } catch (error) {
      console.error(error);
      definirFeedback('Falha de comunicacao ao enviar o template.', 'error');
    } finally {
      setEnviandoTemplate(false);
    }
  };

  const handleSubmitNovoContato = async (event) => {
    event.preventDefault();
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

  const renderizarAnexos = (mensagem) => {
    const anexos = getMessageAttachments(mensagem);

    if (anexos.length === 0) {
      return null;
    }

    return anexos.map((anexo, index) => {
      const tipo = anexo?.file_type || 'file';
      const url = getAttachmentUrl(anexo);

      if (!url) {
        return null;
      }

      if (tipo === 'image') {
        return (
          <div key={`${mensagem.id || 'mensagem'}-anexo-${index}`} style={styles.attachmentCard}>
            <img src={anexo.thumb_url || url} alt="imagem enviada" style={styles.imageAttachment} onClick={() => setImagemAberta(url)} />
          </div>
        );
      }

      if (tipo === 'audio') {
        return (
          <audio key={`${mensagem.id || 'mensagem'}-anexo-${index}`} controls preload="metadata" src={url} style={{ ...styles.audioPlayer, marginBottom: '10px', minWidth: '260px' }} />
        );
      }

      if (tipo === 'video') {
        return (
          <div key={`${mensagem.id || 'mensagem'}-anexo-${index}`} style={styles.attachmentCard}>
            <video controls preload="metadata" src={url} style={{ width: '100%', display: 'block', maxHeight: '340px', backgroundColor: '#000' }} />
          </div>
        );
      }

      return (
        <div key={`${mensagem.id || 'mensagem'}-anexo-${index}`} style={styles.attachmentCard}>
          <a href={url} target="_blank" rel="noreferrer" style={styles.documentLink}>
            <span>Arquivo</span>
            <span style={{ color: '#5f7291', fontWeight: 500 }}>{anexo?.file_size ? `${Math.round(anexo.file_size / 1024)} KB` : 'Abrir / baixar'}</span>
          </a>
        </div>
      );
    });
  };

  return (
    <div style={styles.page}>
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar" style={{ display: 'none' }} onChange={(event) => handleArquivoSelecionado(event)} />
      <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={(event) => handleArquivoSelecionado(event, 'audio')} />

      {imagemAberta ? (
        <div style={styles.modalOverlay} onClick={() => setImagemAberta(null)}>
          <div style={{ maxWidth: 'min(1100px, calc(100vw - 48px))', maxHeight: 'calc(100vh - 48px)' }} onClick={(event) => event.stopPropagation()}>
            <img src={imagemAberta} alt="visualizacao ampliada" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 48px)', borderRadius: '20px', display: 'block', boxShadow: '0 24px 70px rgba(6, 17, 34, 0.45)' }} />
          </div>
        </div>
      ) : null}

      {modalAberto ? (
        <div style={styles.modalOverlay}>
          <div style={{ width: '420px', borderRadius: '24px', backgroundColor: '#ffffff', padding: '28px', boxShadow: '0 28px 80px rgba(6, 17, 34, 0.22)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#10233f' }}>Novo Contato</h3>
            <form onSubmit={handleSubmitNovoContato}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#5f7291' }}>NOME</label>
                <input required style={styles.input} placeholder="Nome do cliente" value={novoContato.name} onChange={(event) => setNovoContato({ ...novoContato, name: event.target.value })} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#5f7291' }}>TELEFONE</label>
                <input style={styles.input} placeholder="+55849..." value={novoContato.phone_number} onChange={(event) => setNovoContato({ ...novoContato, phone_number: event.target.value })} />
              </div>
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#5f7291' }}>CANAL</label>
                <select required style={styles.select} value={novoContato.inbox_id} onChange={(event) => setNovoContato({ ...novoContato, inbox_id: event.target.value })}>
                  <option value="">Selecione o canal...</option>
                  {inboxes.map((inbox) => (
                    <option key={inbox.id} value={inbox.id}>
                      {inbox.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ ...styles.secondaryButton, flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" style={{ ...styles.primaryButton, flex: 1 }}>
                  Criar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalTemplatesAberto ? (
        <div style={styles.modalOverlay}>
          <div
            style={{
              width: 'min(1020px, calc(100vw - 48px))',
              maxHeight: '86vh',
              borderRadius: '24px',
              backgroundColor: '#101820',
              color: '#f8fafc',
              boxShadow: '0 28px 80px rgba(6, 17, 34, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '22px 24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.1 }}>Templates do WhatsApp</div>
                <div style={{ marginTop: '8px', color: '#94a3b8' }}>Selecione um template, preencha as variaveis e envie quando estiver pronto.</div>
              </div>
              <button type="button" style={{ border: 'none', background: 'transparent', color: '#cbd5e1', fontSize: '28px', lineHeight: 1, cursor: 'pointer' }} onClick={() => setModalTemplatesAberto(false)}>
                x
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: 0, flex: 1 }}>
              <div
                style={{
                  padding: '20px',
                  borderRight: '1px solid rgba(148, 163, 184, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  minHeight: 0,
                }}
              >
                <input
                  type="text"
                  value={buscaTemplate}
                  onChange={(event) => setBuscaTemplate(event.target.value)}
                  placeholder="Pesquisar modelos"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    borderRadius: '14px',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    backgroundColor: '#17212b',
                    color: '#f8fafc',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {carregandoTemplates ? <div style={{ color: '#94a3b8' }}>Carregando templates...</div> : null}
                  {!carregandoTemplates && erroTemplates ? <div style={{ color: '#fda4af', lineHeight: 1.6 }}>{erroTemplates}</div> : null}
                  {!carregandoTemplates && !erroTemplates && templatesFiltrados.length === 0 ? <div style={{ color: '#94a3b8' }}>Nenhum template encontrado para esta inbox.</div> : null}

                  {!carregandoTemplates && !erroTemplates
                    ? templatesFiltrados.map((template) => {
                        const ativo = templateSelecionado?.name === template.name;

                        return (
                          <div
                            key={template.id || template.name}
                            style={{
                              padding: '14px',
                              borderRadius: '16px',
                              border: ativo ? '1px solid rgba(96, 165, 250, 0.75)' : '1px solid rgba(148, 163, 184, 0.12)',
                              backgroundColor: ativo ? '#162235' : '#141d26',
                              cursor: 'pointer',
                            }}
                            onClick={() => prepararTemplate(template)}
                          >
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>{template.name}</div>
                            <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: 1.6, color: '#94a3b8' }}>
                              {getTextoTemplate(template).slice(0, 132)}
                              {getTextoTemplate(template).length > 132 ? '...' : ''}
                            </div>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>

              <div style={{ padding: '20px 24px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {templateSelecionado ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '26px', fontWeight: 800 }}>{templateSelecionado.name}</div>
                        <div style={{ marginTop: '6px', color: '#94a3b8' }}>Idioma: {templateSelecionado.language || 'pt_BR'}</div>
                      </div>
                      <div style={{ padding: '8px 12px', borderRadius: '999px', backgroundColor: '#162235', color: '#93c5fd', fontSize: '12px', fontWeight: 700 }}>
                        {templateSelecionado.category || 'UTILITY'}
                      </div>
                    </div>

                    <div>
                      <div style={{ marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>PREVIEW</div>
                      <div style={{ padding: '18px', borderRadius: '18px', backgroundColor: '#141d26', border: '1px solid rgba(148, 163, 184, 0.12)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '15px', color: '#e2e8f0' }}>
                        {formatarPreviewTemplate(templateSelecionado, variaveisTemplate)}
                      </div>
                    </div>

                    {variaveisDetectadas.length > 0 ? (
                      <div>
                        <div style={{ marginBottom: '10px', color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>VARIAVEIS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {variaveisDetectadas.map((indice) => (
                            <div key={indice}>
                              <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '12px', fontWeight: 700 }}>{`Valor ${indice}`}</label>
                              <input
                                type="text"
                                value={variaveisTemplate[indice] || ''}
                                onChange={(event) => setVariaveisTemplate((anterior) => ({ ...anterior, [indice]: event.target.value }))}
                                placeholder={`Insira o valor para ${indice}`}
                                style={{ width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: '#17212b', color: '#f8fafc', outline: 'none', fontSize: '14px' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px 16px', borderRadius: '14px', backgroundColor: '#141d26', color: '#94a3b8' }}>
                        Este template nao possui variaveis editaveis.
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: 'auto' }}>
                      <div style={{ color: variaveisPendentes.length > 0 ? '#fca5a5' : '#94a3b8', fontSize: '13px' }}>
                        {variaveisPendentes.length > 0 ? 'Preencha todas as variaveis para liberar o envio.' : `Destino: ${telefoneDestino || 'sem telefone identificado'}`}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" style={{ ...styles.secondaryButton, color: '#10233f' }} onClick={() => setModalTemplatesAberto(false)}>
                          Voltar
                        </button>
                        <button type="button" style={styles.primaryButton} onClick={enviarTemplateSelecionado} disabled={enviandoTemplate} aria-busy={enviandoTemplate}>
                          {enviandoTemplate ? 'Enviando...' : 'Enviar Template'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8' }}>Selecione um template para visualizar os detalhes.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={styles.rail}>
        <div>
          <div style={styles.railKicker}>Central de atendimento</div>
          <h1 style={styles.railTitle}>MDR Advocacia</h1>
        </div>

        <div style={styles.railSection}>
          <button type="button" style={styles.railButton(visaoAtiva === 'conversas')} onClick={() => setVisaoAtiva('conversas')}>
            Mensagens
          </button>
          <button type="button" style={styles.railButton(visaoAtiva === 'contatos')} onClick={() => setVisaoAtiva('contatos')}>
            Contatos
          </button>
          <button type="button" style={styles.addButton} onClick={() => setModalAberto(true)}>
            Novo contato
          </button>
        </div>

        <div style={styles.railHint}>
          <div style={styles.railHintLabel}>Inbox selecionada</div>
          <div style={styles.railHintValue}>
            {inboxSelecionada === 'all' ? 'Todos os canais' : inboxes.find((inbox) => String(inbox.id) === String(inboxSelecionada))?.name || 'Selecione um canal'}
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <select value={inboxSelecionada} onChange={(event) => setInboxSelecionada(event.target.value)} style={styles.select}>
            <option value="all">Todos os Canais</option>
            {inboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>
                {inbox.name}
              </option>
            ))}
          </select>

          {visaoAtiva === 'conversas' ? (
            <div style={styles.tabs}>
              <button type="button" style={styles.tab(abaAtiva === 'me')} onClick={() => setAbaAtiva('me')}>
                Minhas
              </button>
              <button type="button" style={styles.tab(abaAtiva === 'unassigned')} onClick={() => setAbaAtiva('unassigned')}>
                Nao atribuidas
              </button>
              <button type="button" style={styles.tab(abaAtiva === 'all')} onClick={() => setAbaAtiva('all')}>
                Todas
              </button>
            </div>
          ) : (
            <input type="text" value={buscaContato} onChange={(event) => setBuscaContato(event.target.value)} placeholder="Pesquisar por nome..." style={styles.search} />
          )}
        </div>

        <div style={styles.list}>
          {carregando ? (
            <div style={{ padding: '16px', color: '#6b7d96' }}>Carregando atendimentos...</div>
          ) : registrosVisiveis.length > 0 ? (
            registrosVisiveis.map((item) => {
              const nome = item.meta?.sender?.name || item.name || 'Sem Nome';
              const subtitulo = visaoAtiva === 'conversas' ? getConversationPreview(item) : item.phone_number || 'Abrir conversa';
              const horario = visaoAtiva === 'conversas' ? formatarHorarioConversa(item.last_non_activity_message?.created_at || item.timestamp || item.updated_at) : '';
              const naoLidas = Number(item.unread_count || 0);
              const ativo = conversaSelecionada === item.id;

              return (
                <div
                  key={item.id}
                  style={styles.listCard(ativo)}
                  onClick={() => (visaoAtiva === 'conversas' ? abrirConversa(item.id) : setContatoParaDetalhar(item))}
                >
                  <div style={styles.avatar(ativo)}>{nome.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#10233f', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
                      {horario ? <div style={{ fontSize: '11px', color: '#6b7d96', flexShrink: 0 }}>{horario}</div> : null}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7d96', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitulo}</div>
                      {naoLidas > 0 ? (
                        <div style={{ minWidth: '22px', height: '22px', borderRadius: '999px', backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {naoLidas > 99 ? '99+' : naoLidas}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '16px', color: '#6b7d96' }}>Nenhum registro encontrado.</div>
          )}
        </div>
      </div>
      <div style={styles.chat}>
        {conversaSelecionada ? (
          <>
            <div style={styles.chatHeader}>
              <div>
                <div style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1 }}>{contatoParaDetalhar?.name || 'Atendimento'}</div>
                <div style={{ marginTop: '6px', color: '#6b7d96' }}>{telefoneDestino || 'Sem telefone identificado'}</div>
              </div>
              <div style={styles.badge}>WhatsApp</div>
            </div>

            <div style={styles.chatBody}>
              {carregandoChat ? (
                <div style={{ color: '#6b7d96' }}>Carregando conversa...</div>
              ) : mensagens.length > 0 ? (
                mensagens.map((mensagem, index) => {
                  const minha = mensagem.message_type === 'outgoing' || mensagem.message_type === 1;
                  const iniciais = mensagem.sender?.name?.charAt(0).toUpperCase() || 'C';

                  return (
                    <div key={mensagem.id || index} style={styles.messageRow(minha)}>
                      <div style={{ ...styles.avatar(minha), width: '34px', height: '34px', fontSize: '12px' }}>
                        {mensagem.sender?.avatar_url ? (
                          <img src={mensagem.sender.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          iniciais
                        )}
                      </div>
                      <div style={{ ...styles.bubble(minha), borderColor: mensagem.status === 'failed' ? '#fca5a5' : '#dbe3ee' }}>
                        {renderizarAnexos(mensagem)}
                        {getConteudoVisivelMensagem(mensagem) ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{getConteudoVisivelMensagem(mensagem)}</div> : null}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#6b7d96' }}>
                          {formatarHorario(mensagem.created_at)}
                          {minha ? <span style={styles.statusTag(mensagem.status)}>{getStatusMensagem(mensagem.status)}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#6b7d96' }}>Nenhuma mensagem encontrada para este atendimento.</div>
              )}
              <div ref={(element) => element?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            <div style={styles.composer}>
              {feedbackEnvio ? <div style={styles.feedback(tipoFeedback)}>{feedbackEnvio}</div> : null}

              <div style={styles.composerRow}>
                <button type="button" style={styles.secondaryButton} onClick={abrirModalTemplates}>
                  Templates
                </button>
                <button type="button" style={styles.secondaryButton} onClick={() => abrirSeletorArquivo('arquivo')} disabled={enviandoArquivo}>
                  Arquivo
                </button>
                <button type="button" style={styles.secondaryButton} onClick={() => abrirSeletorArquivo('audio')} disabled={enviandoArquivo}>
                  Audio
                </button>
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(event) => setNovaMensagem(event.target.value)}
                  onKeyDown={(event) => (event.key === 'Enter' ? enviarMensagem() : null)}
                  placeholder="Digite uma mensagem..."
                  style={styles.composerInput}
                />
                <button type="button" style={styles.primaryButton} onClick={enviarMensagem} disabled={enviandoArquivo || enviandoTemplate}>
                  {enviandoArquivo ? 'Enviando arquivo...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px', color: '#10233f' }}>Selecione um atendimento</div>
              <div style={{ maxWidth: '420px', lineHeight: 1.6 }}>
                Abra uma conversa na lista ao lado para carregar o historico e usar templates do WhatsApp com preenchimento de variaveis.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
