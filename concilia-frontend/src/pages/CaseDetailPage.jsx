// src/pages/CaseDetailPage.jsx
// ATUALIZADO: Com botão de Gerar Minuta (PDF)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/CaseDetail.module.css';
import DetailKpiCard from '../components/DetailKpiCard';
// ADICIONADO: Ícone de PDF e Spinner
import { FaDollarSign, FaHandshake, FaTasks, FaExclamationTriangle, FaFilePdf } from 'react-icons/fa'; 
import { ImSpinner2 } from 'react-icons/im';
import ChatPreview from '../components/ChatPreview';
import AgreementChecklist from '../components/AgreementChecklist';

// --- DICIONÁRIOS (MANTIDOS) ---
const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' },
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
};
const PRIORITY_DETAILS = {
    'baixa': { name: 'Prioridade Baixa', color: '#22c55e', textColor: '#FFFFFF' },
    'media': { name: 'Prioridade Média', color: '#f59e0b', textColor: '#FFFFFF' },
    'alta': { name: 'Prioridade Alta', color: '#ef4444', textColor: '#FFFFFF' },
};

const CaseDetailPage = () => {
    const { token } = useAuth();
    const { caseId } = useParams();
    const [legalCase, setLegalCase] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // ADICIONADO: Estado de carregamento do PDF
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    useEffect(() => {
        const fetchAllData = async () => {
            if (!token || !caseId) return;
            setLoading(true);
            setError('');
            try {
                const caseResponse = await apiClient.get(`/cases/${caseId}`);
                setLegalCase(caseResponse.data);

                setIsLoadingMessages(true);
                try {
                    const chatResponse = await apiClient.get(`/cases/${caseId}/conversation`);
                    if (chatResponse.data && chatResponse.data.conversation) {
                        setConversation(chatResponse.data.conversation);
                        setMessages(chatResponse.data.messages || []);
                    }
                } catch (chatError) {
                    console.error("Nenhuma conversa encontrada ou erro:", chatError);
                }
            } catch (err) {
                setError('Não foi possível carregar os dados do caso.');
            } finally {
                setLoading(false);
                setIsLoadingMessages(false);
            }
        };

        fetchAllData();
    }, [caseId, token]);
    
    const handleSendMessage = async (content) => {
        if (!content.trim() || !conversation) {
            alert('Não há uma conversa vinculada para enviar a mensagem.');
            return;
        }
        setIsSending(true);
        try {
            const response = await apiClient.post(`/conversations/${conversation.id}/messages`, { content });
            setMessages(currentMessages => [...currentMessages, response.data]);
        } catch (err) {
            alert('Não foi possível enviar a mensagem.');
        } finally {
            setIsSending(false);
        }
    };

    // --- NOVA FUNÇÃO: GERAR PDF ---
    const handleGenerateAgreement = async () => {
        if (!legalCase.agreement_value) {
            alert("Este caso ainda não tem um Valor Negociado definido para gerar a minuta.");
            return;
        }

        setIsGeneratingPdf(true);
        try {
            // Chama a rota que criamos no Laravel, pedindo um BLOB (arquivo)
            const response = await apiClient.get(`/cases/${caseId}/agreement`, {
                responseType: 'blob', 
                headers: { Authorization: `Bearer ${token}` }
            });

            // Cria um link temporário para baixar o arquivo
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `minuta_processo_${legalCase.case_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link); // Limpa
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao gerar a minuta. Verifique se o backend está rodando.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleChecklistUpdate = async (updatedFields) => {
        // Atualiza estado local (UI instantânea)
        setLegalCase(prev => ({ ...prev, ...updatedFields }));

        try {
            // Envia para API (o Model já aceita o JSON graças ao $casts)
            await api.put(`/legal-cases/${id}`, updatedFields);
        } catch (error) {
            console.error("Erro ao salvar checklist", error);
        }
    };
    // --- FIM DA FUNÇÃO ---

    if (loading) return <p>Carregando detalhes do caso...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!legalCase) return <p>Caso não encontrado.</p>;

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const currentStatus = STATUS_DETAILS[legalCase.status] || { text: legalCase.status, color: '#A0AEC0', textColor: '#1A202C' };
    const currentPriority = PRIORITY_DETAILS[legalCase.priority] || { text: legalCase.priority, color: '#A0AEC0', textColor: '#1A202C' };
    
    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <div>
                    <Link to="/pipeline" className={styles.backLink}>{"< Voltar"}</Link>
                    <h1 className={styles.title}>Detalhes do Caso #{legalCase.case_number}</h1>
                    <p>Informações completas e histórico do processo</p>
                </div>
                
                {/* --- LADO DIREITO DO CABEÇALHO --- */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <div className={styles.tags}>
                        <span className={styles.tag} style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}>{currentStatus.name}</span>
                        <span className={styles.tag} style={{ backgroundColor: currentPriority.color, color: currentPriority.textColor }}>{currentPriority.name}</span>
                    </div>

                    {/* --- BOTÃO NOVO DE PDF --- */}
                    <button 
                        className={styles.pdfButton} 
                        onClick={handleGenerateAgreement}
                        disabled={isGeneratingPdf}
                    >
                        {isGeneratingPdf ? <ImSpinner2 className={styles.spinner} /> : <FaFilePdf />}
                        {isGeneratingPdf ? 'Gerando...' : 'Gerar Minuta'}
                    </button>
                </div>
            </div>

            <div className={styles.kpiGrid}>
                <DetailKpiCard icon={<FaDollarSign />} title="Valor da Causa" value={formatCurrency(legalCase.cause_value)} color="#3b82f6" />
                <DetailKpiCard icon={<FaHandshake />} title="Valor Negociado" value={formatCurrency(legalCase.agreement_value)} color="#16a34a" />
                <DetailKpiCard 
                    icon={<FaTasks />} 
                    title="Probabilidade de Acordo" 
                    value={legalCase.agreement_probability ? `${legalCase.agreement_probability}%` : '0%'} 
                    color="#9333ea" 
                />
                <DetailKpiCard icon={<FaExclamationTriangle />} title="Advogado Adverso" value={legalCase.opposing_lawyer || 'Não informado'} color="#dc2626">{legalCase.opposing_contact}</DetailKpiCard>
            </div>

            <div className={styles.mainGrid}>
                <div className={styles.leftColumn}>
                    <div className={styles.infoCard}>
                        <h3>Informações do Processo</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}><label>Banco</label><p>{legalCase.client?.name}</p></div>
                            <div className={styles.infoItem}><label>Autor</label><p>{legalCase.opposing_party}</p></div>
                            <div className={styles.infoItem}><label>Colaborador Responsável</label><p>{legalCase.lawyer?.name}</p></div>
                            <div className={styles.infoItem}><label>Data de Criação</label><p>{new Date(legalCase.created_at).toLocaleDateString('pt-BR')}</p></div>
                        </div>
                        <div className={styles.infoItem} style={{ marginTop: '1rem' }}><label>Descrição do Caso</label><p>{legalCase.description}</p></div>
                    </div>

                    <div className={styles.infoCard}>
                        <h3>Comunicação via WhatsApp</h3>
                        {isLoadingMessages ? (
                            <p>Carregando mensagens...</p>
                        ) : conversation ? (
                            <ChatPreview
                                messages={messages}
                                onSendMessage={handleSendMessage}
                                isSending={isSending}
                                isInteractive={true}
                                contactName={conversation.contact_name}
                                contactNumber={conversation.contact_phone}
                            />
                        ) : (
                            <p>Nenhuma conversa vinculada a este caso.</p>
                        )}
                    </div>
                </div>

                <div className={styles.rightColumn}>
                    <div className={styles.infoCard}>
                        <h3>$ Valores e Negociação</h3>
                        <div className={`${styles.valueBlock} ${styles.blueBlock}`}><label>Alçada de Negociação</label><p>{formatCurrency(legalCase.original_value)}</p><span>Valor autorizado para acordo</span></div>
                        <div className={`${styles.valueBlock} ${styles.greenBlock}`}><label>Valor Negociado</label><p>{formatCurrency(legalCase.agreement_value)}</p><span>Dentro da alçada aprovada</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaseDetailPage;