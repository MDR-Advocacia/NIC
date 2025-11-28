// src/pages/InboxPage.jsx
// ATUALIZADO COM AVATARES DE INICIAIS

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import styles from '../styles/InboxPage.module.css';
import LinkCaseModal from '../components/LinkCaseModal';
import ChatPreview from '../components/ChatPreview';
import { FaInbox } from 'react-icons/fa'; // FaUserCircle não é mais necessário

// --- FUNÇÕES AUXILIARES PARA O AVATAR ---

// Pega as iniciais de um nome
const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0][0];

    if (names.length > 1) {
        initials += names[names.length - 1][0];
    }
    return initials.toUpperCase();
};

// Gera uma cor de fundo com base no nome
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

// --- FIM DAS FUNÇÕES AUXILIARES ---


const InboxPage = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [linkingConversationId, setLinkingConversationId] = useState(null);
    
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);

    const fetchUnassignedConversations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/chat/unassigned');
            setConversations(response.data);
        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnassignedConversations();
    }, [fetchUnassignedConversations]);

    const fetchMessages = async (conversationId) => {
        if (!conversationId) return;
        setChatLoading(true);
        try {
            const response = await apiClient.get(`/chat/conversations/${conversationId}`);
            setMessages(response.data);
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
    }, [selectedConversation]);


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

    return (
        <>
            <div className={styles.pageContainer}>
                <header className={styles.header}>
                    <h1>Caixa de Entrada</h1>
                    <p>Contatos que buscaram acordo e aguardam vinculação a um processo.</p>
                </header>

                <div className={styles.inboxLayout}>
                    <aside className={styles.conversationListPanel}>
                        {loading ? <p style={{ padding: '1rem' }}>Carregando...</p> : conversations.map(convo => (
                            <div
                                key={convo.id}
                                className={`${styles.conversationItem} ${selectedConversation?.id === convo.id ? styles.active : ''}`}
                                onClick={() => setSelectedConversation(convo)}
                            >
                                {/* --- AVATAR MODIFICADO --- */}
                                <div 
                                    className={styles.avatar} 
                                    style={{ backgroundColor: getAvatarColor(convo.contact_name) }}
                                >
                                    {getInitials(convo.contact_name)}
                                </div>
                                {/* --- FIM DA MODIFICAÇÃO --- */}

                                <div className={styles.conversationDetails}>
                                    <div className={styles.contactHeader}>
                                        <span className={styles.contactName}>{convo.contact_name}</span>
                                        <span className={styles.timestamp}>{formatTimestamp(convo.timestamp)}</span>
                                    </div>
                                    <p className={styles.lastMessage}>{convo.last_message}</p>
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
                                        onSendMessage={(msg) => console.log("Enviar mensagem:", msg)}
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