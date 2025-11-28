// src/components/LinkCaseModal.jsx
import React, { useState } from 'react';
import apiClient from '../api';
import styles from '../styles/LinkCaseModal.module.css'; // ALTERADO: Usaremos um novo arquivo de estilo
import { FaSearch } from 'react-icons/fa';

const LinkCaseModal = ({ conversationId, onClose, onLinkSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // NOVO: Estado para saber se uma busca já foi feita
  const [selectedCase, setSelectedCase] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true); // Marca que a busca foi realizada
    setCases([]); // Limpa resultados anteriores
    try {
      // A API de busca de processos
      const response = await apiClient.get(`/cases?search=${searchTerm}`);
      // CORREÇÃO: A API retorna um array diretamente em response.data
      setCases(response.data);
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedCase) {
      alert('Por favor, selecione um processo para vincular.');
      return;
    }
    try {
      await apiClient.post(`/chat/conversations/${conversationId}/link`, {
        legal_case_id: selectedCase.id,
      });
      alert('Conversa vinculada com sucesso!');
      onLinkSuccess();
    } catch (error) {
      // --- ALTERAÇÃO IMPORTANTE AQUI ---
      console.error("Erro detalhado ao vincular processo:", error.response);
      
      let errorMessage = 'Falha ao vincular o processo.';

      // Se o backend enviou uma resposta com detalhes do erro, vamos exibi-la.
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += `\n\nMotivo: ${error.response.data.message}`;
      } else if (error.response) {
        errorMessage += `\n\nCódigo do Erro: ${error.response.status}`;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Vincular Conversa ao Processo</h2>
        <p>Busque pelo número do processo, autor ou réu.</p>
        
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite para buscar..."
            className={styles.searchInput}
          />
          <button type="submit" disabled={loading}>
            <FaSearch />
          </button>
        </form>

        <div className={styles.resultsContainer}>
          {loading ? (
            <div className={styles.feedbackText}>Buscando...</div>
          ) : cases.length > 0 ? (
            <ul className={styles.resultsList}>
              {cases.map((c) => (
                <li
                  key={c.id}
                  className={`${styles.resultItem} ${selectedCase?.id === c.id ? styles.selected : ''}`}
                  onClick={() => setSelectedCase(c)}
                >
                  <strong className={styles.caseNumber}>{c.case_number}</strong>
                  <span className={styles.caseParty}>{c.opposing_party}</span>
                  <small className={styles.caseClient}>{c.client?.name}</small>
                </li>
              ))}
            </ul>
          ) : searched && (
            <div className={styles.feedbackText}>Nenhum processo encontrado.</div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button onClick={handleLink} className={styles.linkButton} disabled={!selectedCase || loading}>
            Vincular
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkCaseModal;