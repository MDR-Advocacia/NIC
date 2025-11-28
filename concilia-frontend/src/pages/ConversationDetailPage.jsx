import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import ChatPreview from '../components/ChatPreview';
import styles from '../styles/ConversationDetailPage.module.css';

const ConversationDetailPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Busca os detalhes da conversa e as mensagens
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [convoResponse, messagesResponse] = await Promise.all([
                apiClient.get(`/conversations/${conversationId}`),
                apiClient.get(`/conversations/${conversationId}/messages`)
            ]);
            setConversation(convoResponse.data);
            setMessages(messagesResponse.data);
        } catch (error) {
            console.error("Erro ao carregar dados da conversa:", error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSendMessage = async (content) => {
        if (!content.trim()) return;
        setIsSending(true);
        try {
            const response = await apiClient.post(`/conversations/${conversationId}/messages`, { content });
            setMessages(prevMessages => [...prevMessages, response.data]);
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert('Não foi possível enviar a mensagem.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={() => navigate('/inbox')} className={styles.backButton}>
                    &larr; Voltar para Caixa de Entrada
                </button>
                <h1>Conversa #{conversationId}</h1>
            </div>

            {loading ? (
                <p>Carregando conversa...</p>
            ) : (
                <ChatPreview
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isSending={isSending}
                    isInteractive={true}
                    contactName={conversation?.contact_name}
                    contactNumber={conversation?.contact_phone}
                />
            )}
        </div>
    );
};

export default ConversationDetailPage;