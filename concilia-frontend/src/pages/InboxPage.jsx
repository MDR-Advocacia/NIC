// src/pages/InboxPage.jsx
// ATUALIZADO: Correção de Autenticação (Token) e Avatares

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // IMPORTANTE: Importar o contexto de auth
import apiClient from '../api';
import styles from '../styles/InboxPage.module.css';
import LinkCaseModal from '../components/LinkCaseModal';
import ChatPreview from '../components/ChatPreview';
import { FaInbox } from 'react-icons/fa';

// --- FUNÇÕES AUXILIARES PARA O AVATAR ---
const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0][0];
    if (names.length > 1) {
        initials += names[names.length - 1][0];
    }
    return initials.toUpperCase();
};

const getAvatarColor = (name) => {
    const colors = [
        '#e57373', '#81c784', '#64b5f6', '#ffb74d', 
        '#9575cd', '#4db6ac', '#f06292', '#a1887f'
    ];
    let hash = 0;
    if (!name || name.length === 0) return colors[0];
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
};

const InboxPage = () => {
    // 1. PEGA O TOKEN DO CONTEXTO
    const { token } = useAuth();

    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [linkingConversationId, setLinkingConversationId] = useState(null);
    
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);

    // 2. BUSCA CONVERSAS COM TOKEN
    const fetchUnassignedConversations = useCallback(async () => {
        if (!token) return; // Não busca sem token
        setLoading(true);
        try {
            const response = await apiClient.get('/chat/unassigned', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Suporte a envelopamento de dados (data.data ou data direto)
            const lista = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setConversations(lista);
        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
            // Opcional: tratar erro 401 aqui se quiser redirecionar
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchUnassignedConversations();
        }
    }, [fetchUnassignedConversations, token]);

    // 3. BUSCA MENSAGENS COM TOKEN
    const fetchMessages = async (conversationId) => {
        if (!conversationId || !token) return;
        setChatLoading(true);
        try {
            const response = await apiClient.get(`/chat/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Tratamento robusto da resposta
            let msgs = [];
            if (Array.isArray(response.data)) {
                msgs = response.data;
            } else if (response.data.messages) {
                msgs = response.data.messages;
            } else if (response.data.data && response.data.data.messages) {
                msgs = response.data.data.messages;
            }

            setMessages(msgs);
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            setMessages([]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        } else {
            setMessages([]);
        }
    }, [selectedConversation]); // token já está implícito na função fetchMessages mas idealmente estaria nas deps se fosse useCallback

    const handleLinkCase = (conversationId) => {
        setLinkingConversationId(conversationId);
    };

    const handleCloseModal = () => {
        setLinkingConversationId(null);
    };

    const handleLinkSuccess = () => {
        setLinkingConversationId(null);
        setSelectedConversation(null); 
        fetchUnassignedConversations();
    };

    const formatTimestamp = (unix) => {
        if (!unix) return '';
        const date = new Date(unix * 1000);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    
    // Função de enviar mensagem (caso precise implementar no futuro)
    const handleSendMessage = async (content) => {
        if (!selectedConversation || !token) return;
        try {
            // Exemplo de POST com token
            // await apiClient.post(..., { content }, { headers: { Authorization: `Bearer ${token}` } })
            console.log("Enviar:", content);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <div className={styles.pageContainer}>
                <header className={styles.header}>
                    <h1>Caixa de Entrada</h1>
                    <p>Contatos que buscaram acordo e aguardam vinculação a um processo.</p>
                </header>

                <div className={styles.inboxLayout}>
                    <aside className={styles.conversationListPanel}>
                        {loading ? <p style={{ padding: '1rem' }}>Carregando conversas...</p> : 
                         conversations.length === 0 ? <p style={{ padding: '1rem', color:'#a0aec0' }}>Nenhuma conversa pendente.</p> :
                         conversations.map(convo => (
                            <div
                                key={convo.id}
                                className={`${styles.conversationItem} ${selectedConversation?.id === convo.id ? styles.active : ''}`}
                                onClick={() => setSelectedConversation(convo)}
                            >
                                <div 
                                    className={styles.avatar} 
                                    style={{ backgroundColor: getAvatarColor(convo.contact_name) }}
                                >
                                    {getInitials(convo.contact_name)}
                                </div>

                                <div className={styles.conversationDetails}>
                                    <div className={styles.contactHeader}>
                                        <span className={styles.contactName}>{convo.contact_name || 'Desconhecido'}</span>
                                        <span className={styles.timestamp}>{formatTimestamp(convo.timestamp)}</span>
                                    </div>
                                    <p className={styles.lastMessage}>
                                        {convo.last_message || '...'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </aside>

                    <main className={styles.chatViewPanel}>
                        {selectedConversation ? (
                            <>
                                <div className={styles.chatHeader}>
                                    <div className={styles.chatHeaderInfo}>
                                        <h3>{selectedConversation.contact_name}</h3>
                                        <span>{selectedConversation.contact_phone}</span>
                                    </div>
                                    <button onClick={() => handleLinkCase(selectedConversation.id)} className={styles.linkButton}>
                                        Vincular Processo
                                    </button>
                                </div>
                                {chatLoading ? <p style={{padding: '1rem', textAlign: 'center'}}>Carregando mensagens...</p> : (
                                    <ChatPreview
                                        messages={messages}
                                        isInteractive={true}
                                        onSendMessage={handleSendMessage}
                                        contactName={selectedConversation.contact_name}
                                        contactNumber={selectedConversation.contact_phone}
                                    />
                                )}
                            </>
                        ) : (
                            <div className={styles.placeholder}>
                                <FaInbox size={50} />
                                <h2>Selecione uma conversa</h2>
                                <p>Escolha uma conversa da lista à esquerda para ver os detalhes e interagir.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {linkingConversationId && (
                <LinkCaseModal
                    conversationId={linkingConversationId}
                    onClose={handleCloseModal}
                    onLinkSuccess={handleLinkSuccess}
                />
            )}
        </>
    );
};

export default InboxPage;