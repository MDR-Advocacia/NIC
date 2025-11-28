// src/pages/ImportDataPage.jsx
import React, { useState, useEffect } from 'react';
import { FaDownload, FaUser, FaUpload, FaEye, FaWrench, FaPaperPlane, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import styles from '../styles/ImportDataPage.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import Papa from 'papaparse';

const ImportDataPage = () => {
    const { token } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    
    const [parsedData, setParsedData] = useState([]);
    const [tableHeaders, setTableHeaders] = useState([]);
    const [error, setError] = useState('');

    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    useEffect(() => {
        const fetchClients = async () => {
            if (!token) return;
            try {
                const response = await apiClient.get('/clients', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setClients(response.data);
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                setError('Não foi possível carregar a lista de clientes.');
            }
        };
        fetchClients();
    }, [token]);

    const handleDownloadTemplate = () => {
        const headers = [
            'case_number', 'opposing_party', 'defendant', 'lawyer_id', 
            'action_object', 'priority', 'cause_value', 'original_value', 
            'agreement_value', 'comarca', 'state', 'description'
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'template_importacao_casos.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setError('');
            setImportResult(null);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0 && results.meta.fields.length > 0) {
                        setTableHeaders(results.meta.fields);
                        setParsedData(results.data);
                        setCurrentStep(3);
                    } else {
                        setError('O arquivo está vazio ou em um formato inválido.');
                    }
                },
                error: (err) => { setError('Ocorreu um erro ao ler o arquivo.'); }
            });
        }
    };

    const handleImport = async () => {
        if (!selectedClient || parsedData.length === 0) {
            setError("Cliente não selecionado ou não há dados para importar.");
            return;
        }
        setIsImporting(true);
        setError('');
        setImportResult(null);
        setCurrentStep(5);

        try {
            const response = await apiClient.post('/cases/import', {
                client_id: selectedClient,
                cases: parsedData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setImportResult({
                success: true,
                message: response.data.message,
                successCount: response.data.success_count,
                errors: response.data.errors,
            });
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setImportResult({
                    success: false,
                    message: err.response.data.message || "Erro de validação.",
                    successCount: err.response.data.success_count || 0,
                    errors: err.response.data.errors || [],
                });
            } else {
                setError("Ocorreu um erro inesperado no servidor durante a importação.");
                setImportResult({ success: false, message: "Erro de servidor.", successCount: 0, errors: [] });
            }
        } finally {
            setIsImporting(false);
        }
    };

    const startNewImport = () => {
        setCurrentStep(1);
        setSelectedClient('');
        setParsedData([]);
        setTableHeaders([]);
        setError('');
        setImportResult(null);
    };
  
    const steps = [
      { number: 1, title: 'Selecionar Cliente', subtitle: 'Escolher transcorrente', icon: <FaUser /> },
      { number: 2, title: 'Upload Arquivo', subtitle: 'Selecionar planilha', icon: <FaUpload /> },
      { number: 3, title: 'Preview Dados', subtitle: 'Visualizar dados', icon: <FaEye /> },
      { number: 4, title: 'Configurar', subtitle: 'Mapear colunas', icon: <FaWrench /> },
      { number: 5, title: 'Importar', subtitle: 'Processar dados', icon: <FaPaperPlane /> },
    ];
  
    return (
      <div className={styles.pageContainer}>
        <header className={styles.header}>
            <div>
                <h1>Importar Dados</h1>
                <p>Importe casos em lote através de planilha Excel.</p>
            </div>
            <button className={styles.templateButton} onClick={handleDownloadTemplate}>
                <FaDownload /> Baixar Template
            </button>
        </header>
        <section className={styles.stepper}>
            {steps.map(step => (
                <div key={step.number} className={`${styles.step} ${currentStep >= step.number ? styles.active : ''}`}>
                    <div className={styles.stepNumber}>{step.icon}</div>
                    <div>
                        <div className={styles.stepTitle}>{step.title}</div>
                        <div className={styles.stepSubtitle}>{step.subtitle}</div>
                    </div>
                </div>
            ))}
        </section>
        
        {error && <p className={styles.errorBox}>{error}</p>}

        {currentStep === 1 && (
            <section className={styles.contentCard}>
                <h2><FaUser /> Selecionar Cliente</h2>
                <div className={styles.formGroup}>
                    <label htmlFor="client-select" className={styles.label}>Selecione o cliente (banco) para o qual deseja importar os casos:</label>
                    <select id="client-select" className={styles.select} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                        <option value="">Selecione o cliente...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                {selectedClient && (
                    <div className={styles.stepActions}><button className={styles.nextButton} onClick={() => setCurrentStep(2)}>Avançar</button></div>
                )}
            </section>
        )}
        {currentStep === 2 && (
            <section className={styles.contentCard}>
                <h2><FaUpload /> Upload do Arquivo CSV</h2>
                <div className={styles.formGroup}>
                    <label htmlFor="file-upload" className={styles.label}>Selecione o arquivo CSV preenchido:</label>
                    <input type="file" id="file-upload" className={styles.fileInput} accept=".csv" onChange={handleFileChange} />
                </div>
                <div className={styles.stepActions}>
                    <button className={styles.prevButton} onClick={() => setCurrentStep(1)}>Voltar</button>
                </div>
            </section>
        )}
        {currentStep === 3 && (
            <section className={styles.contentCard}>
                <h2><FaEye /> Pré-visualização dos Dados ({parsedData.length} linhas encontradas)</h2>
                <div className={styles.previewTableContainer}>
                    <table className={styles.previewTable}>
                        <thead>
                            <tr>
                                {tableHeaders.map(header => <th key={header}>{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {tableHeaders.map(header => <td key={`${rowIndex}-${header}`}>{row[header]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={styles.stepActions}>
                    <button className={styles.prevButton} onClick={() => setCurrentStep(2)}>Voltar</button>
                    <button className={styles.nextButton} onClick={() => setCurrentStep(4)}>Confirmar e Avançar</button>
                </div>
            </section>
        )}
        {currentStep === 4 && (
            <section className={styles.contentCard}>
                <h2><FaWrench /> Confirmar Importação</h2>
                <p>Você está prestes a importar <strong>{parsedData.length} casos</strong> para o cliente <strong>{clients.find(c => c.id == selectedClient)?.name}</strong>.</p>
                <p>Esta ação tentará inserir todos os registros válidos no banco de dados. Se algum registro falhar na validação, a importação inteira será cancelada para garantir a integridade dos dados.</p>
                <div className={styles.stepActions}>
                    <button className={styles.prevButton} onClick={() => setCurrentStep(3)}>Voltar</button>
                    <button className={styles.nextButton} onClick={handleImport}>Iniciar Importação</button>
                </div>
            </section>
        )}
        {currentStep === 5 && (
            <section className={styles.contentCard}>
                <h2><FaPaperPlane /> Resultado da Importação</h2>
                {isImporting ? <p>Por favor, aguarde enquanto processamos os dados...</p> : (
                    importResult && (
                        <div>
                            {importResult.success ? (
                                <div className={styles.resultSuccess}>
                                    <h3><FaCheckCircle /> {importResult.message}</h3>
                                    <p><strong>{importResult.successCount}</strong> casos foram importados com sucesso.</p>
                                </div>
                            ) : (
                                <div className={styles.resultError}>
                                    <h3><FaExclamationTriangle /> {importResult.message}</h3>
                                    <p>Nenhum caso foi importado. Corrija os erros na sua planilha e tente novamente.</p>
                                    {importResult.errors && importResult.errors.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {importResult.errors.map((error, index) => (
                                                <li key={index}>
                                                    <strong>Linha {error.line}:</strong> {error.errors.join(', ')}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                            <div className={styles.stepActions}>
                                <button className={styles.prevButton} onClick={startNewImport}>Iniciar Nova Importação</button>
                            </div>
                        </div>
                    )
                )}
            </section>
        )}
      </div>
    );
};

export default ImportDataPage;