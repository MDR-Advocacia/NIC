// src/pages/CaseDetailPage.jsx


import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/CaseDetail.module.css';
import DetailKpiCard from '../components/DetailKpiCard';
import { FaDollarSign, FaHandshake, FaTasks, FaExclamationTriangle, FaFilePdf, FaMapMarkerAlt, FaGavel, FaUserTie } from 'react-icons/fa'; 
import { ImSpinner2 } from 'react-icons/im';
import ChatPreview from '../components/ChatPreview';
import AgreementChecklist from '../components/AgreementChecklist';

// --- DICIONÁRIOS ---
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
    const [debugInfo, setDebugInfo] = useState(null); // Para mostrar o erro real na tela

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const [isAbusiveLawyer, setIsAbusiveLawyer] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!token || !caseId) return;
            setLoading(true);
            setError('');
            
            // CONFIGURAÇÃO DE AUTENTICAÇÃO
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // CORREÇÃO: Adicionado 'config' na chamada
                const caseResponse = await apiClient.get(`/cases/${caseId}`, config);
                console.log("DADOS BRUTOS DO CASO:", caseResponse.data); 

                // 1. TRATAMENTO DE FORMATO DE RESPOSTA
                let caseData = caseResponse.data;
                if (caseData && caseData.data && !caseData.id) {
                    caseData = caseData.data;
                }

                if (!caseData || !caseData.id) {
                    throw new Error("Formato de dados inválido recebido do servidor.");
                }

                setLegalCase(caseData);

                // 2. LÓGICA DE ADVOGADO ADVERSO (Blindada)
                let opposingLawyerId = null;
                
                if (caseData.opposing_lawyer_id) {
                    opposingLawyerId = caseData.opposing_lawyer_id;
                } else if (caseData.opposing_lawyer && typeof caseData.opposing_lawyer === 'object') {
                    opposingLawyerId = caseData.opposing_lawyer.id;
                    if (caseData.opposing_lawyer.is_abusive) setIsAbusiveLawyer(true);
                }

                if (opposingLawyerId && !isAbusiveLawyer) {
                    try {
                        // CORREÇÃO: Adicionado 'config' na chamada
                        const advResponse = await apiClient.get('/opposing-lawyers', config);
                        const listaAdvogados = Array.isArray(advResponse.data) ? advResponse.data : (advResponse.data.data || []);
                        
                        if (Array.isArray(listaAdvogados)) {
                            const found = listaAdvogados.find(a => a.id === opposingLawyerId);
                            if (found && found.is_abusive) setIsAbusiveLawyer(true);
                        }
                    } catch (e) { 
                        console.warn("Não foi possível verificar status abusivo do advogado:", e); 
                    }
                }

                // 3. CARREGA CHAT
                setIsLoadingMessages(true);
                try {
                    // CORREÇÃO: Adicionado 'config' na chamada
                    const chatResponse = await apiClient.get(`/cases/${caseId}/conversation`, config);
                    const chatData = chatResponse.data;
                    
                    if (chatData && chatData.conversation) {
                        setConversation(chatData.conversation);
                        setMessages(chatData.messages || []);
                    } else if (chatData && chatData.data && chatData.data.conversation) {
                        setConversation(chatData.data.conversation);
                        setMessages(chatData.data.messages || []);
                    }
                } catch (chatError) {
                    console.warn("Nenhuma conversa encontrada ou erro ao carregar chat.");
                }

            } catch (err) {
                console.error("Erro crítico ao carregar caso:", err);
                const msg = err.response?.data?.message || err.message || "Erro desconhecido";
                const status = err.response?.status ? `Status: ${err.response.status}` : "";
                
                if (err.response?.status === 401) {
                    setError('Sessão expirada. Por favor, faça login novamente.');
                } else {
                    setError('Não foi possível carregar os dados.');
                }
                setDebugInfo(`${msg} ${status}`);
            } finally {
                setLoading(false);
                setIsLoadingMessages(false);
            }
        };

        fetchAllData();
    }, [caseId, token]);
    
    const handleSendMessage = async (content) => {
        if (!content.trim() || !conversation) {
            alert('Não há uma conversa vinculada.');
            return;
        }
        setIsSending(true);
        try {
            // CORREÇÃO: Adicionado Authorization header
            const response = await apiClient.post(
                `/chat/conversations/${conversation.id}/messages`, 
                { content },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages(currentMessages => [...currentMessages, response.data]);
        } catch (err) {
            alert('Erro ao enviar mensagem.');
        } finally {
            setIsSending(false);
        }
    };

    const handleGenerateAgreement = async () => {
        if (!legalCase?.agreement_value) {
            alert("Defina um Valor Negociado para gerar a minuta.");
            return;
        }
        setIsGeneratingPdf(true);
        try {
            const response = await apiClient.get(`/cases/${caseId}/agreement`, {
                responseType: 'blob', 
                headers: { Authorization: `Bearer ${token}` }
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `minuta_processo_${legalCase.case_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            alert("Erro ao gerar a minuta.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (loading) return <p style={{padding:'20px'}}>Carregando detalhes do processo...</p>;
    
    // EXIBIÇÃO DE ERRO COM DEBUG
    if (error) return (
        <div style={{padding:'20px', color: '#e53e3e'}}>
            <h3>{error}</h3>
            {debugInfo && (
                <div style={{background: '#fff5f5', padding: '10px', borderRadius: '5px', marginTop: '10px', border: '1px solid #feb2b2'}}>
                    <strong>Detalhes técnicos:</strong>
                    <pre style={{whiteSpace: 'pre-wrap', fontSize: '0.85rem'}}>{debugInfo}</pre>
                </div>
            )}
            <Link to="/pipeline" style={{display:'inline-block', marginTop:'15px', color:'#3182ce'}}>Voltar para a Lista</Link>
        </div>
    );

    if (!legalCase) return <p>Caso não encontrado.</p>;

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const currentStatus = STATUS_DETAILS[legalCase.status] || { name: legalCase.status, color: '#A0AEC0', textColor: '#1A202C' };
    const currentPriority = PRIORITY_DETAILS[legalCase.priority] || { name: legalCase.priority, color: '#A0AEC0', textColor: '#1A202C' };
    
    // --- HELPERS PARA EXIBIR DADOS COMPLEXOS ---
    const getPartyName = (party) => {
        if (!party) return '-';
        if (typeof party === 'string') return party;
        return party.name || party.nome || '-';
    };

    const getLawyerName = (lawyer) => {
        if (!lawyer) return 'Não inf.';
        if (typeof lawyer === 'string') return lawyer;
        return lawyer.name || lawyer.nome || 'Não inf.';
    };

    return (
        <div className={styles.pageContainer}>
            {/* CABEÇALHO */}
            <div className={styles.header}>
                <div>
                    <Link to="/pipeline" className={styles.backLink}>{"< Voltar"}</Link>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <h1 className={styles.title}>Processo #{legalCase.case_number}</h1>
                        {legalCase.internal_number && (
                            <span style={{background:'#edf2f7', padding:'2px 8px', borderRadius:'4px', fontSize:'0.8rem', color:'#4a5568'}}>
                                Interno: {legalCase.internal_number}
                            </span>
                        )}
                    </div>
                    {/* TRATAMENTO AQUI: Usa helper function para extrair nome se for objeto */}
                    <p>{legalCase.action_object} - {getPartyName(legalCase.opposing_party)} x {getPartyName(legalCase.defendant)}</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <div className={styles.tags}>
                        <span className={styles.tag} style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}>{currentStatus.name}</span>
                        <span className={styles.tag} style={{ backgroundColor: currentPriority.color, color: currentPriority.textColor }}>{currentPriority.name}</span>
                    </div>
                    <button className={styles.pdfButton} onClick={handleGenerateAgreement} disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <ImSpinner2 className={styles.spinner} /> : <FaFilePdf />}
                        {isGeneratingPdf ? 'Gerando...' : 'Gerar Minuta'}
                    </button>
                </div>
            </div>

            {/* ALERTAS VISUAIS */}
            {isAbusiveLawyer && (
                <div style={{background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <FaExclamationTriangle size={20} />
                    <div>
                        <strong>Atenção: Litigante Abusivo Identificado</strong>
                        <p style={{margin:0, fontSize: '0.9rem'}}>O advogado adverso deste caso está marcado como litigante abusivo/habitual. Redobre a atenção na negociação.</p>
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className={styles.kpiGrid}>
                <DetailKpiCard icon={<FaDollarSign />} title="Valor da Causa" value={formatCurrency(legalCase.cause_value)} color="#3b82f6" />
                <DetailKpiCard icon={<FaHandshake />} title="Proposta Inicial" value={formatCurrency(legalCase.agreement_value)} color="#16a34a" />
                <DetailKpiCard icon={<FaTasks />} title="PCOND (Risco)" value={legalCase.pcond_probability ? `${legalCase.pcond_probability}%` : '-'} color="#9333ea">
                    {legalCase.updated_condemnation_value ? `Cond. Atual: ${formatCurrency(legalCase.updated_condemnation_value)}` : 'Sem estimativa'}
                </DetailKpiCard>
                {/* TRATAMENTO AQUI: Usa helper function */}
                <DetailKpiCard icon={<FaUserTie />} title="Advogado Adverso" value={getLawyerName(legalCase.opposing_lawyer)} color={isAbusiveLawyer ? "#dc2626" : "#4a5568"}>
                    {legalCase.opposing_contact || 'Sem contato'}
                </DetailKpiCard>
            </div>

            <div className={styles.mainGrid}>
                {/* COLUNA ESQUERDA */}
                <div className={styles.leftColumn}>
                    {/* INFO GERAL */}
                    <div className={styles.infoCard}>
                        <h3><FaGavel style={{marginRight:'8px', color:'#718096'}}/> Dados do Processo</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}><label>Banco</label><p>{legalCase.client?.name}</p></div>
                            <div className={styles.infoItem}><label>Colaborador</label><p>{legalCase.lawyer?.name}</p></div>
                            <div className={styles.infoItem}><label>Distribuição</label><p>{legalCase.start_date ? new Date(legalCase.start_date).toLocaleDateString('pt-BR') : '-'}</p></div>
                            <div className={styles.infoItem}><label>Juizado Especial?</label><p>{legalCase.special_court || 'Não'}</p></div>
                        </div>
                        
                        <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0'}}>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}><label><FaMapMarkerAlt /> Comarca</label><p>{legalCase.comarca || '-'}</p></div>
                                <div className={styles.infoItem}><label>Cidade</label><p>{legalCase.city || '-'}</p></div>
                                <div className={styles.infoItem}><label>UF</label><p>{legalCase.state || '-'}</p></div>
                            </div>
                        </div>

                        <div className={styles.infoItem} style={{ marginTop: '1rem' }}>
                            <label>Observações</label>
                            <p style={{whiteSpace: 'pre-wrap'}}>{legalCase.description || 'Sem observações.'}</p>
                        </div>
                    </div>

                    {/* CHECKLIST (READ ONLY) */}
                    {legalCase.agreement_checklist_data && (
                        <div className={styles.infoCard}>
                            <h3>Checklist de Análise</h3>
                            <AgreementChecklist 
                                checklistData={legalCase.agreement_checklist_data} 
                                onUpdate={() => {}} // Read-only visual effect
                            />
                        </div>
                    )}

                    {/* CHAT */}
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
                            <p style={{color: '#a0aec0', fontStyle: 'italic'}}>Nenhuma conversa vinculada a este caso.</p>
                        )}
                    </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className={styles.rightColumn}>
                    <div className={styles.infoCard}>
                        <h3>$ Análise Financeira</h3>
                        <div className={`${styles.valueBlock} ${styles.blueBlock}`}>
                            <label>Alçada (Original)</label>
                            <p>{formatCurrency(legalCase.original_value)}</p>
                            <span>Limite aprovado</span>
                        </div>
                        
                        {legalCase.updated_condemnation_value && (
                            <div className={`${styles.valueBlock}`} style={{background: '#fff5f5', borderLeft: '4px solid #fc8181', marginTop:'10px'}}>
                                <label style={{color:'#c53030'}}>Condenação Atualizada</label>
                                <p style={{color:'#c53030', fontSize:'1.2rem', fontWeight:'bold'}}>{formatCurrency(legalCase.updated_condemnation_value)}</p>
                                <span>Risco estimado</span>
                            </div>
                        )}

                        <div className={`${styles.valueBlock} ${styles.greenBlock}`} style={{marginTop:'10px'}}>
                            <label>Proposta Acordo</label>
                            <p>{formatCurrency(legalCase.agreement_value)}</p>
                            <span>Valor atual trabalhado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaseDetailPage;