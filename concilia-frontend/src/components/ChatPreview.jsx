import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/ChatPreview.module.css';
import { IoSend } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";

const ChatPreview = ({
    messages = [],
    onSendMessage,
    isSending,
    isInteractive = false,
    contactName,
    contactNumber
}) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim() && onSendMessage) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    // --- FUNÇÃO DE DATA CORRIGIDA ---
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';

        // new Date() consegue interpretar tanto um número (timestamp UNIX * 1000)
        // quanto uma string de data (como "2025-10-15 14:30:00")
        const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
        
        // Verifica se a data resultante é válida antes de formatar
        if (isNaN(date.getTime())) {
            return ''; // Retorna vazio se a data for inválida
        }

        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={styles.chatContainer}>
            {isInteractive && (
                <div className={styles.chatHeader}>
                    <FaUserCircle size={40} className={styles.headerIcon} />
                    <div className={styles.headerInfo}>
                        <h4 className={styles.contactName}>{contactName || 'Nome do Contato'}</h4>
                        <p className={styles.contactNumber}>{contactNumber || 'Não informado'}</p>
                    </div>
                </div>
            )}

            <div className={styles.messagesList}>
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={message.message_type === 1 ? styles.outgoingMessageContainer : styles.incomingMessageContainer}
                    >
                        <div className={styles.messageBubble}>
                            <p className={styles.messageContent}>{message.content}</p>
                            {/* Agora usa a data da mensagem, que pode ser 'timestamp' ou 'created_at' */}
                            <span className={styles.messageTimestamp}>{formatTimestamp(message.created_at || message.timestamp)}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {isInteractive && (
                <form className={styles.chatInputArea} onSubmit={handleSend}>
                    <input
                        type="text"
                        className={styles.chatInput}
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending}
                    />
                    <button type="submit" className={styles.sendButton} disabled={isSending}>
                        <IoSend />
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChatPreview;