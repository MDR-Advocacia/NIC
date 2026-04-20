import React, { useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/LinkCaseModal.module.css';

const extrairListaProcessos = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payload)) return data.payload;
  return [];
};

const formatarPartes = (processo) => {
  const partes = [
    processo?.plaintiff?.name,
    processo?.defendantRel?.name,
    processo?.opposing_party,
  ].filter(Boolean);

  return partes.join(' • ') || 'Partes nao informadas';
};

const LinkCaseModal = ({ conversationId, contactName, contactPhone, onClose, onLinkSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [feedback, setFeedback] = useState('');

  const resultados = useMemo(() => cases.filter(Boolean), [cases]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSearched(true);
    setFeedback('');
    setCases([]);

    try {
      const response = await apiClient.get('/cases', {
        params: {
          search: searchTerm.trim(),
          per_page: 20,
          sort_by: 'updated_at',
          sort_order: 'desc',
        },
      });

      setCases(extrairListaProcessos(response.data));
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      setFeedback('Nao foi possivel buscar os processos agora.');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedCase) {
      setFeedback('Selecione um processo para continuar.');
      return;
    }

    try {
      const response = await apiClient.post(`/chat/conversations/${conversationId}/link`, {
        legal_case_id: selectedCase.id,
        contact_name: contactName || '',
        contact_phone: contactPhone || '',
      });

      onLinkSuccess?.({
        id: selectedCase.id,
        case_number: selectedCase.case_number,
        backend_message: response?.data?.message || '',
      });
    } catch (error) {
      console.error('Erro detalhado ao vincular processo:', error.response || error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Falha ao vincular o processo.';

      setFeedback(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Vincular conversa ao processo</h2>
        <p>Busque pelo numero do processo, autor, reu ou parte adversa.</p>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Digite para buscar..."
            className={styles.searchInput}
          />
          <button type="submit" disabled={loading}>
            <FaSearch />
          </button>
        </form>

        <div className={styles.resultsContainer}>
          {loading ? <div className={styles.feedbackText}>Buscando...</div> : null}

          {!loading && resultados.length > 0 ? (
            <ul className={styles.resultsList}>
              {resultados.map((processo) => (
                <li
                  key={processo.id}
                  className={`${styles.resultItem} ${selectedCase?.id === processo.id ? styles.selected : ''}`}
                  onClick={() => setSelectedCase(processo)}
                >
                  <strong className={styles.caseNumber}>{processo.case_number}</strong>
                  <span className={styles.caseParty}>{formatarPartes(processo)}</span>
                  <small className={styles.caseClient}>{processo.client?.name || 'Cliente nao informado'}</small>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && searched && resultados.length === 0 ? (
            <div className={styles.feedbackText}>Nenhum processo encontrado.</div>
          ) : null}
        </div>

        {feedback ? <div className={styles.feedbackText} style={{ height: 'auto', justifyContent: 'flex-start', marginTop: '12px' }}>{feedback}</div> : null}

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button type="button" onClick={handleLink} className={styles.linkButton} disabled={!selectedCase || loading}>
            Vincular
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkCaseModal;
