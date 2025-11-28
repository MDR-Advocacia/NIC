// src/components/NewCaseModal.jsx
import React, { useState } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Pipeline.module.css';

const brazilianStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const actionObjects = ["Contrato de Empréstimo - Juros Abusivos", "Cartão de Crédito - Cobrança Indevida", "Financiamento Imobiliário - Revisional", "Conta Corrente - Tarifas Abusivas", "Consignado - Desconto Indevido", "Cheque Especial - Juros Excessivos", "Seguro - Cobrança Indevida", "CDC - Venda Casada"];
const availableColors = ['#EF4444', '#F97316', '#FBBF24', ' #84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899'];

const NewCaseModal = ({ onClose, clients, lawyers, onCaseCreated }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    case_number: '',
    action_object: '',
    opposing_party: '',
    defendant: '',
    client_id: '',
    lawyer_id: '',
    comarca: '',
    state: '',
    start_date: '', // 1. CAMPO ADICIONADO AO ESTADO
    special_court: 'Não',
    opposing_lawyer: '',
    opposing_contact: '',
    original_value: '',
    agreement_value: '',
    cause_value: '',
    status: 'initial_analysis',
    priority: 'media',
    description: '',
    tags: [],
  });

  const [newTagText, setNewTagText] = useState('');
  const [newTagColor, setNewTagColor] = useState(availableColors[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handlePriorityChange = (priority) => {
    setFormData(prevState => ({ ...prevState, priority: priority }));
  };

  const handleAddTag = () => {
    if (newTagText.trim() === '') return;
    const newTag = { text: newTagText, color: newTagColor };
    setFormData(prevState => ({
      ...prevState,
      tags: [...(prevState.tags || []), newTag]
    }));
    setNewTagText('');
    setNewTagColor(availableColors[0]);
  };

  const handleRemoveTag = (indexToRemove) => {
    setFormData(prevState => ({
      ...prevState,
      tags: prevState.tags.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await apiClient.post('/cases', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Caso criado com sucesso!');
      if (onCaseCreated) {
        onCaseCreated();
      }
      onClose();
    } catch (err) {
      console.error("Erro ao criar o caso:", err.response?.data);
      setError(err.response?.data?.message || 'Erro ao criar o caso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>Novo Caso</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formSection} style={{ borderTop: 'none', paddingTop: 0 }}>
            <h3 className={styles.formSectionTitle}>Informações do Processo</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="case_number">Número do Processo</label>
                <input className={styles.input} type="text" id="case_number" name="case_number" value={formData.case_number} onChange={handleChange} required placeholder="Digite o número do processo" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="action_object">Objeto da Ação</label>
                <select className={styles.select} id="action_object" name="action_object" value={formData.action_object} onChange={handleChange} required>
                  <option value="">Selecione o objeto da ação</option>
                  {actionObjects.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                </select>
              </div>
              {/* 2. CAMPO DE DATA ADICIONADO AO FORMULÁRIO */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="start_date">Data de Distribuição</label>
                <input className={styles.input} type="date" id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ... (o restante do formulário continua igual) ... */}
          
          <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Partes Envolvidas</h3>
             <div className={styles.formGrid}>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="opposing_party">Autor</label>
                 <input className={styles.input} type="text" id="opposing_party" name="opposing_party" value={formData.opposing_party} onChange={handleChange} required placeholder="Digite o nome do autor" />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="defendant">Réu</label>
                 <input className={styles.input} type="text" id="defendant" name="defendant" value={formData.defendant} onChange={handleChange} required placeholder="Digite o nome do réu" />
               </div>
             </div>
           </div>

           <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Informações Institucionais</h3>
             <div className={styles.formGrid}>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="client_id">Banco</label>
                 <select className={styles.select} id="client_id" name="client_id" value={formData.client_id} onChange={handleChange} required>
                   <option value="">Selecione o banco</option>
                   {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                 </select>
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="lawyer_id">Colaborador Responsável</label>
                 <select className={styles.select} id="lawyer_id" name="lawyer_id" value={formData.lawyer_id} onChange={handleChange} required>
                   <option value="">Selecione o colaborador</option>
                   {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                 </select>
               </div>
             </div>
           </div>

           <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Localização e Contato</h3>
             <div className={styles.formGrid}>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="comarca">Comarca</label>
                 <input className={styles.input} type="text" id="comarca" name="comarca" value={formData.comarca} onChange={handleChange} />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="state">Estado</label>
                 <select className={styles.select} id="state" name="state" value={formData.state} onChange={handleChange}>
                   <option value="">Selecione o estado</option>
                   {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                 </select>
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="special_court">Juizado Especial</label>
                 <select className={styles.select} id="special_court" name="special_court" value={formData.special_court} onChange={handleChange}>
                   <option value="Não">Não</option>
                   <option value="Sim">Sim</option>
                 </select>
               </div>
               <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                 <label className={styles.label} htmlFor="opposing_lawyer">Nome do Advogado da Parte Adversa</label>
                 <input className={styles.input} type="text" id="opposing_lawyer" name="opposing_lawyer" value={formData.opposing_lawyer} onChange={handleChange} />
               </div>
               <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                 <label className={styles.label} htmlFor="opposing_contact">Contato da Parte Adversa</label>
                 <input className={styles.input} type="text" id="opposing_contact" name="opposing_contact" value={formData.opposing_contact} onChange={handleChange} placeholder="Ex: +5511999998888 ou email@exemplo.com" />
               </div>
             </div>
           </div>

           <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Valores</h3>
             <div className={styles.formGrid}>
               <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                 <label className={styles.label} htmlFor="cause_value">Valor da Causa</label>
                 <input className={styles.input} type="number" step="0.01" id="cause_value" name="cause_value" value={formData.cause_value} onChange={handleChange} />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="original_value">Valor da Alçada</label>
                 <input className={styles.input} type="number" step="0.01" id="original_value" name="original_value" value={formData.original_value} onChange={handleChange} required />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label} htmlFor="agreement_value">Valor da Proposta de Acordo</label>
                 <input className={styles.input} type="number" step="0.01" id="agreement_value" name="agreement_value" value={formData.agreement_value} onChange={handleChange} />
               </div>
             </div>
           </div>

           <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Prioridade e Etiquetas</h3>
             <div className={styles.priorityButtons}>
               <button type="button" className={`${styles.priorityButton} ${styles.alta} ${formData.priority === 'alta' ? styles.selected : ''}`} onClick={() => handlePriorityChange('alta')}>Alta</button>
               <button type="button" className={`${styles.priorityButton} ${styles.media} ${formData.priority === 'media' ? styles.selected : ''}`} onClick={() => handlePriorityChange('media')}>Média</button>
               <button type="button" className={`${styles.priorityButton} ${styles.baixa} ${formData.priority === 'baixa' ? styles.selected : ''}`} onClick={() => handlePriorityChange('baixa')}>Baixa</button>
             </div>
             <label className={styles.label}>Adicionar Etiqueta Personalizada</label>
             <div className={styles.tagCreator}>
               <input type="text" className={styles.tagInput} value={newTagText} onChange={(e) => setNewTagText(e.target.value)} placeholder="Nome da nova etiqueta..." />
               <button type="button" className={styles.addButton} onClick={handleAddTag}>+ Adicionar</button>
             </div>
             <div className={styles.colorPicker}>
               {availableColors.map(color => (
                 <div key={color} className={`${styles.colorDot} ${newTagColor === color ? styles.selected : ''}`} style={{ backgroundColor: color }} onClick={() => setNewTagColor(color)} />
               ))}
             </div>
             <div className={styles.tagList} style={{ marginTop: '1rem' }}>
               {(formData.tags || []).map((tag, index) => (
                 <div key={index} className={styles.tagItem} style={{ backgroundColor: tag.color }}>
                   <span>{tag.text}</span>
                   <button type="button" className={styles.tagRemoveButton} onClick={() => handleRemoveTag(index)}>&times;</button>
                 </div>
               ))}
             </div>
           </div>

           <div className={styles.formSection}>
             <h3 className={styles.formSectionTitle}>Observações</h3>
             <div className={styles.formGroup}>
               <textarea className={styles.input} name="description" value={formData.description} onChange={handleChange} rows="4" placeholder="Adicione observações relevantes sobre o caso..."></textarea>
             </div>
           </div>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCaseModal;