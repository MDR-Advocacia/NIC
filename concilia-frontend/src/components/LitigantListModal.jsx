// src/components/LitigantListModal.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import AddEditLitigantModal from './AddEditLitigantModal';
// Reutilizando estilos existentes (ajuste se necessário)
import styles from '../styles/CasesListModal.module.css'; 

const LitigantListModal = ({ isOpen, onClose }) => {
  const [litigants, setLitigants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Controle do Modal de Edição/Criação
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [selectedLitigant, setSelectedLitigant] = useState(null);

  const fetchLitigants = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const response = await apiClient.get('/litigants', { params });
      setLitigants(response.data);
    } catch (error) {
      console.error("Erro ao buscar litigantes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLitigants();
    }
  }, [isOpen, searchTerm]);

  const handleEdit = (litigant) => {
    setSelectedLitigant(litigant);
    setShowAddEdit(true);
  };

  const handleCreate = () => {
    setSelectedLitigant(null);
    setShowAddEdit(true);
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Tem certeza que deseja excluir esta parte?")) return;
      try {
          await apiClient.delete(`/litigants/${id}`);
          fetchLitigants();
      } catch (error) {
          alert("Erro ao excluir. Verifique se não há processos vinculados.");
      }
  }

  const handleSuccess = () => {
    fetchLitigants();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '900px' }}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>Gerenciar Partes (Autores e Réus)</h2>

        <div className={styles.filters} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            style={{ flex: 1, marginRight: '10px' }}
          />
          <button onClick={handleCreate} className={styles.primaryButton} style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            + Nova Parte
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.casesTable}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>CPF/CNPJ</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {litigants.length > 0 ? (
                  litigants.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.type}</td>
                      <td>{item.doc_number || '-'}</td>
                      <td>{item.email || '-'}</td>
                      <td>{item.phone || '-'}</td>
                      <td>
                        <button 
                          onClick={() => handleEdit(item)} 
                          style={{ marginRight: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#3B82F6' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#EF4444' }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma parte encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Aninhado para Criar/Editar */}
      {showAddEdit && (
        <AddEditLitigantModal
          isOpen={showAddEdit}
          onClose={() => setShowAddEdit(false)}
          litigantToEdit={selectedLitigant}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default LitigantListModal;