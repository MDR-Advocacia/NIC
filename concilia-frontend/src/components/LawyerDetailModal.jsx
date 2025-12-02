import React from 'react';
import styles from '../styles/LawyerDetailModal.module.css';
import DetailKpiCard from './DetailKpiCard';
import { FaTimes } from 'react-icons/fa';

const LawyerDetailModal = ({ isOpen, onClose, lawyer }) => {
    // 1. BLINDAGEM: Se não estiver aberto ou não tiver dados, não renderiza nada.
    if (!isOpen || !lawyer) return null;

    console.log("Dados recebidos no Modal:", lawyer); // Para depuração no console (F12)

    // 2. FUNÇÃO SEGURA: Converte qualquer coisa para número ou devolve 0
    const parseCurrency = (value) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // Remove tudo que não é dígito, ponto ou traço
            const cleanStr = value.replace(/[^\d,-]/g, "").replace(',', '.');
            const num = parseFloat(cleanStr);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    // 3. EXTRAÇÃO SEGURA: Usa '?.' para evitar erro se 'performance' não existir
    const economyStr = lawyer.performance?.economy || 'R$ 0,00';
    const conversionStr = lawyer.performance?.conversion || 0;
    const dealsCount = lawyer.performance?.deals || 0;
    
    // Tenta pegar do total_cases, se não tiver, tenta estimar somando (segurança)
    const totalCases = lawyer.total_cases || (dealsCount + 5); 
    
    // Cálculo seguro
    const economyNum = parseCurrency(economyStr);
    const metaValue = 500000;
    
    // Evita divisão por zero
    const progressPercent = metaValue > 0 
        ? Math.min((economyNum / metaValue) * 100, 100).toFixed(1) 
        : 0;

    // Evita número negativo
    const activeCases = Math.max(0, totalCases - dealsCount);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
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
                        title="Acordos Fechados" 
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