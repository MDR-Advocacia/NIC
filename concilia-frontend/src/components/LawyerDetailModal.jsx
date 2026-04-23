import React, { useEffect } from 'react';
import styles from '../styles/LawyerDetailModal.module.css';
import DetailKpiCard from './DetailKpiCard';
import { FaTimes } from 'react-icons/fa';
import MetricInfoHint from './MetricInfoHint';
import { AGREEMENT_COUNT_INFO_TEXT } from '../constants/dashboardMetrics';

const LawyerDetailModal = ({ isOpen, onClose, lawyer }) => {
    
    // 1. NOVO: Hook para fechar com a tecla ESC
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    // 2. BLINDAGEM: Se não estiver aberto ou não tiver dados, não renderiza nada.
    if (!isOpen || !lawyer) return null;

    // console.log("Dados recebidos no Modal:", lawyer); 

    // 3. FUNÇÃO SEGURA: Converte qualquer coisa para número ou devolve 0
    const parseCurrency = (value) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleanStr = value.replace(/[^\d,-]/g, "").replace(',', '.');
            const num = parseFloat(cleanStr);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    // 4. EXTRAÇÃO SEGURA
    const economyStr = lawyer.performance?.economy || 'R$ 0,00';
    const conversionStr = lawyer.performance?.conversion || 0;
    const dealsCount = lawyer.performance?.deals || 0;
    
    const totalCases = lawyer.worked_cases || lawyer.total_cases || (dealsCount + 5); 
    
    const economyNum = parseCurrency(economyStr);
    const metaValue = 500000;
    
    const progressPercent = metaValue > 0 
        ? Math.min((economyNum / metaValue) * 100, 100).toFixed(1) 
        : 0;

    const activeCases = Math.max(0, totalCases - dealsCount);

    // 5. NOVO: Handler para clicar no fundo escuro (Overlay)
    const handleOverlayClick = (e) => {
        // Verifica se o clique foi exatamente no overlay (fundo) e não no conteúdo
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        // Adicionado onClick no overlay
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            {/* Adicionado stopPropagation para que cliques DENTRO do modal não fechem ele */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>

                <div className={styles.header}>
                    <h2>{lawyer.name || 'Advogado'}</h2>
                    {lawyer.isLeader && <span className={styles.leaderBadge}>Líder do Mês</span>}
                </div>

                <div className={styles.metricsGrid}>
                    <DetailKpiCard 
                        title="Economia Gerada" 
                        value={economyStr} 
                        subtext={`Meta: R$ ${metaValue.toLocaleString('pt-BR')}`} 
                    />
                    <DetailKpiCard 
                        title="Taxa de Conversão" 
                        value={`${conversionStr}%`} 
                        subtext={`${dealsCount} acordos fechados`} 
                    />
                    <DetailKpiCard 
                        title="Casos Ativos" 
                        value={activeCases} 
                        subtext="Em andamento" 
                    />
                    <DetailKpiCard 
                        title={(
                            <span className={styles.titleWithInfo}>
                                <span>Acordos Fechados</span>
                                <MetricInfoHint text={AGREEMENT_COUNT_INFO_TEXT} />
                            </span>
                        )}
                        value={dealsCount} 
                        subtext="Total acumulado" 
                    />
                </div>

                <div className={styles.progressSection}>
                    <h3>Progresso da Meta Mensal</h3>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressLabels}>
                            <span>Economia vs Meta</span>
                            <span>{progressPercent}% da meta atingida</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill} 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        <div className={styles.progressValues}>
                            <span>Alcançado: {economyStr}</span>
                            <span>Meta: R$ {metaValue.toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LawyerDetailModal;
