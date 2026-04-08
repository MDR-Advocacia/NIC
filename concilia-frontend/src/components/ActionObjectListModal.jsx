import React, { useEffect, useState } from 'react';
import { FaCheck, FaEdit, FaSearch } from 'react-icons/fa';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Modal.module.css';
import AddEditActionObjectModal from './AddEditActionObjectModal';

const ActionObjectListModal = ({ onClose, onSelect }) => {
  const { token } = useAuth();
  const [actionObjects, setActionObjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingActionObject, setEditingActionObject] = useState(null);

  const fetchActionObjects = async (search = '') => {
    setLoading(true);

    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiClient.get(`/action-objects${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActionObjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao buscar causas de pedir:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchActionObjects(searchTerm);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, token]);

  const handleActionObjectSaved = (savedActionObject) => {
    setActionObjects((current) => {
      const alreadyExists = current.some((item) => item.id === savedActionObject.id);

      if (alreadyExists) {
        return current
          .map((item) => (item.id === savedActionObject.id ? savedActionObject : item))
          .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
      }

      return [...current, savedActionObject].sort((left, right) =>
        left.name.localeCompare(right.name, 'pt-BR')
      );
    });
  };

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal} style={{ maxWidth: '720px' }}>
          <div className={styles.header}>
            <h2>Selecionar Causa de Pedir</h2>
            <button onClick={onClose} className={styles.closeButton}>
              &times;
            </button>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <input
              type="text"
              className={styles.input}
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ paddingLeft: '2.8rem' }}
              autoFocus
            />
            <FaSearch
              style={{
                position: 'absolute',
                left: '12px',
                top: '13px',
                color: '#718096',
                fontSize: '1.1rem',
              }}
            />
          </div>

          <div
            style={{
              maxHeight: '430px',
              overflowY: 'auto',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              backgroundColor: '#1a202c',
            }}
          >
            {loading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>
                Carregando lista...
              </p>
            ) : actionObjects.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f7fafc' }}>
                <thead
                  style={{
                    background: '#2d3748',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <tr>
                    <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #4a5568' }}>
                      Nome
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'right', borderBottom: '1px solid #4a5568' }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actionObjects.map((actionObject) => (
                    <tr key={actionObject.id} style={{ borderBottom: '1px solid #2d3748' }}>
                      <td style={{ padding: '12px 15px', fontWeight: 600 }}>{actionObject.name}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingActionObject(actionObject)}
                            className={styles.cancelButton}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FaEdit /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(actionObject);
                              onClose();
                            }}
                            className={styles.saveButton}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FaCheck /> Usar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#718096' }}>
                <p style={{ marginBottom: '10px', fontSize: '1.1rem' }}>Nenhuma causa de pedir encontrada.</p>
                <p style={{ fontSize: '0.9rem' }}>Tente outro termo ou cadastre um novo.</p>
              </div>
            )}
          </div>

          <div className={styles.footer} style={{ marginTop: '1.5rem', borderTop: 'none' }}>
            <button onClick={onClose} className={styles.cancelButton}>
              Fechar
            </button>
          </div>
        </div>
      </div>

      {editingActionObject && (
        <AddEditActionObjectModal
          actionObject={editingActionObject}
          onClose={() => setEditingActionObject(null)}
          onSuccess={handleActionObjectSaved}
        />
      )}
    </>
  );
};

export default ActionObjectListModal;
