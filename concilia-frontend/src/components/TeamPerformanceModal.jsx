import React from 'react';
import styles from '../styles/TeamPerformanceModal.module.css';
import { FaSearch, FaTimes } from 'react-icons/fa';
import LawyerPerformanceCard from './LawyerPerformanceCard';

// Usaremos os mesmos dados fictícios por enquanto
const mockPerformanceData = [
    { id: 1, name: 'Dr. Carlos Santos', isLeader: true, score: 98.2, ranking: 1, performance: { economy: 'R$ 519.700', conversion: '78.3', deals: 23 }, products: { used: 8, value: 'R$ 68.000', economy: 'R$ 25.500' } },
    { id: 2, name: 'Dra. Ana Costa', isLeader: false, score: 88.7, ranking: 2, performance: { economy: 'R$ 453.200', conversion: '72.1', deals: 19 }, products: { used: 6, value: 'R$ 35.000', economy: 'R$ 20.400' } },
    { id: 3, name: 'Dr. Roberto Lima', isLeader: false, score: 82.1, ranking: 3, performance: { economy: 'R$ 398.000', conversion: '65.5', deals: 15 }, products: { used: 5, value: 'R$ 31.000', economy: 'R$ 18.200' } }
];

// 1. Receba a prop 'onViewDetails' aqui
const TeamPerformanceModal = ({ isOpen, onClose, onViewDetails }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>Performance da Equipe</h2>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                </div>

                <div className={styles.filters}>
                    <div className={styles.searchInput}>
                        <FaSearch color="#a0aec0" />
                        <input type="text" placeholder="Buscar advogado..." />
                    </div>
                    <select className={styles.filterSelect}>
                        <option>Todos</option>
                    </select>
                    <select className={styles.filterSelect}>
                        <option>Posição</option>
                    </select>
                    <button className={styles.compareButton}>Comparar</button>
                </div>

                <div className={styles.modalBody}>
                    {mockPerformanceData.map((lawyer, index) => (
                        // 2. Passe a prop 'onViewDetails' para cada card
                        <LawyerPerformanceCard 
                            key={lawyer.id} 
                            lawyer={lawyer} 
                            rank={index + 1} 
                            onViewDetails={onViewDetails} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TeamPerformanceModal;