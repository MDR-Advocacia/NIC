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

    const columnMapping = {
        'Número do Processo': 'case_number',
        'Número Interno': 'internal_number',
        'Objeto da Ação': 'action_object',
        'Data de Distribuição': 'start_date',
        'Autor': 'opposing_party',
        'Réu': 'defendant',
        'Nome do Advogado Responsável': 'lawyer_name',
        'Advogado Adverso': 'opposing_lawyer', // NOVO CAMPO
        'Comarca': 'comarca',
        'Cidade': 'city',
        'UF': 'state',
        'Juizado Especial': 'special_court',
        'Valor da Causa': 'cause_value',
        'Valor de Alçada': 'original_value',
        'Proposta Inicial': 'agreement_value',
        'Condenação Atualizada': 'updated_condemnation_value',
        'Prob de Cond': 'pcond_probability',
        'Prioridade': 'priority',
        'Obs': 'description'
    };

    const getHeaderLabel = (key) => {
        return Object.keys(columnMapping).find(ptKey => columnMapping[ptKey] === key) || key;
    };

    useEffect(() => {
        const fetchClients = async () => {
            if (!token) return;
            try {
                const response = await apiClient.get('/clients', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const list = response.data;
                setClients(list);

                const bb = list.find(c => c.name.toLowerCase().includes('banco do brasil') || c.name.toLowerCase().includes('bb'));
                if (bb) {
                    setSelectedClient(bb.id);
                }
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                setError('Não foi possível carregar a lista de clientes.');
            }
        };
        fetchClients();
    }, [token]);

    const handleDownloadTemplate = () => {
        const headersForTemplate = [
            'Número do Processo *',
            'Número Interno',
            'Objeto da Ação *',
            'Data de Distribuição',
            'Autor *',
            'Réu *',
            'Nome do Advogado Responsável *',
            'Advogado Adverso', // NOVO
            'Comarca',
            'Cidade',
            'UF',
            'Juizado Especial',
            'Valor da Causa',
            'Valor de Alçada',
            'Proposta Inicial',
            'Condenação Atualizada',
            'Prob de Cond',
            'Prioridade',
            'Obs'
        ];
        
        const exampleRow = [
            '0000000-00.2023.8.26.0000', 
            '123456',                    
            'Indenização por Danos Morais', 
            '01/01/2024',                
            'João da Silva',             
            'Banco do Brasil S.A.',      
            'Marcos Délli',
            'Dr. Estranho', // Exemplo Advogado Adverso    
            'São Paulo',                 
            'São Paulo',                 
            'SP',                        
            'Sim',                       
            '10000.00',                  
            '5000.00',                   
            '2000.00',                   
            '12000.00',                  
            '50',                        
            'Media',                     
            'Cliente alega cobrança indevida'
        ];

        const csvContent = headersForTemplate.join(';') + "\n" + exampleRow.join(';');
        const bom = "\uFEFF"; 
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Template_Importacao_Concilia_BB.csv');
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
                encoding: "UTF-8",
                complete: (results) => {
                    if (results.data.length > 1) { 
                        const realData = results.data.slice(1); 

                        const mappedData = realData.map(row => {
                            const newRow = {};
                            Object.keys(row).forEach(csvKey => {
                                const cleanKey = csvKey.trim().replace(' *', '');
                                const dbKey = columnMapping[cleanKey] || cleanKey; 
                                newRow[dbKey] = row[csvKey];
                            });
                            return newRow;
                        });

                        setParsedData(mappedData);
                        if (mappedData.length > 0) {
                            setTableHeaders(Object.keys(mappedData[0]));
                            setCurrentStep(3);
                        } else {
                            setError('O arquivo parece conter apenas o exemplo. Preencha com dados reais.');
                        }
                    } else {
                        setError('O arquivo está vazio ou contém apenas o cabeçalho/exemplo.');
                    }
                },
                error: (err) => { setError('Erro ao ler arquivo: ' + err.message); }
            });
        }
    };

    const handleImport = async () => {
        if (!selectedClient || parsedData.length === 0) {
            setError("Cliente ou dados inválidos.");
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
                    message: "Erro de validação nos dados. Nada foi importado.",
                    successCount: 0,
                    errors: err.response.data.errors || [],
                });
            } else {
                setError("Erro no servidor. Tente novamente.");
                setImportResult({ success: false, message: "Erro crítico.", successCount: 0, errors: [] });
            }
        } finally {
            setIsImporting(false);
        }
    };

    const startNewImport = () => {
        setCurrentStep(2); 
        setParsedData([]);
        setTableHeaders([]);
        setError('');
        setImportResult(null);
    };
  
    const steps = [
      { number: 1, title: 'Cliente', subtitle: 'Banco do Brasil', icon: <FaUser /> },
      { number: 2, title: 'Planilha', subtitle: 'Upload CSV', icon: <FaUpload /> },
      { number: 3, title: 'Conferência', subtitle: 'Visualizar', icon: <FaEye /> },
      { number: 4, title: 'Processar', subtitle: 'Confirmação', icon: <FaWrench /> },
      { number: 5, title: 'Conclusão', subtitle: 'Relatório', icon: <FaPaperPlane /> },
    ];
  
    return (
      <div className={styles.pageContainer}>
        <header className={styles.header}>
            <div>
                <h1>Importar Dados</h1>
                <p>Importação em lote otimizada.</p>
            </div>
            <button className={styles.templateButton} onClick={handleDownloadTemplate}>
                <FaDownload /> Baixar Modelo Excel
            </button>
        </header>

        <section className={styles.stepper}>
            {steps.map(step => (
                <div key={step.number} className={`${styles.step} ${currentStep >= step.number ? styles.active : ''}`}>
                    <div className={styles.stepNumber}>{step.icon}</div>
                    <div className={styles.stepText}><div className={styles.stepTitle}>{step.title}</div></div>
                </div>
            ))}
        </section>
        
        {error && <div className={styles.errorBox}><FaExclamationTriangle /> {error}</div>}

        {/* PASSO 1: Seleção (Auto) */}
        {currentStep === 1 && (
            <section className={styles.contentCard}>
                <h2><FaUser /> Cliente Destino</h2>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Cliente Selecionado:</label>
                    <select className={styles.select} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} disabled={true}>
                        <option value="">Carregando...</option>
                        {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                    </select>
                    <p style={{marginTop:'10px', color:'#4a5568'}}>O cliente padrão <strong>Banco do Brasil</strong> foi selecionado automaticamente.</p>
                </div>
                <div className={styles.stepActions}>
                    <button className={styles.nextButton} onClick={() => setCurrentStep(2)} disabled={!selectedClient}>Confirmar</button>
                </div>
            </section>
        )}

        {/* PASSO 2: Upload */}
        {currentStep === 2 && (
            <section className={styles.contentCard}>
                <h2><FaUpload /> Carregar Planilha</h2>
                
                {/* AQUI: Usando classe CSS escura para o aviso */}
                <div className={styles.warningBox}>
                    <strong>Atenção:</strong> O sistema irá <u>ignorar a linha 2</u> (exemplo) do arquivo. Comece a preencher seus dados a partir da linha 3.
                </div>

                <div className={styles.uploadArea}>
                    <input type="file" id="file-upload" className={styles.fileInput} accept=".csv" onChange={handleFileChange} />
                    <label htmlFor="file-upload" className={styles.uploadLabel}>
                        <FaDownload size={24} /> <span>Clique para selecionar o arquivo CSV</span>
                    </label>
                </div>
                <div className={styles.stepActions}><button className={styles.prevButton} onClick={() => setCurrentStep(1)}>Voltar</button></div>
            </section>
        )}

        {/* PASSO 3: Preview */}
        {currentStep === 3 && (
            <section className={styles.contentCard}>
                <h2><FaEye /> Pré-visualização ({parsedData.length} registros reais)</h2>
                <p style={{fontSize: '0.9rem', marginBottom: '1rem', color: '#a0aec0'}}>A linha de exemplo foi removida automaticamente.</p>
                <div className={styles.previewTableContainer}>
                    <table className={styles.previewTable}>
                        <thead>
                            <tr>
                                {tableHeaders.slice(0, 8).map(header => (
                                    <th key={header}>{getHeaderLabel(header)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.slice(0, 5).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {tableHeaders.slice(0, 8).map(header => <td key={`${rowIndex}-${header}`}>{row[header]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {parsedData.length > 5 && <p style={{textAlign:'center', padding:'10px', color: '#718096'}}>... e mais {parsedData.length - 5} linhas.</p>}
                </div>
                <div className={styles.stepActions}>
                    <button className={styles.prevButton} onClick={() => setCurrentStep(2)}>Voltar</button>
                    <button className={styles.nextButton} onClick={() => setCurrentStep(4)}>Validar Dados</button>
                </div>
            </section>
        )}

        {/* PASSO 4: Confirmar */}
        {currentStep === 4 && (
            <section className={styles.contentCard}>
                <h2><FaWrench /> Processar Importação</h2>
                
                {/* AQUI: Usando classe CSS escura para o resumo */}
                <div className={styles.summaryBox}>
                    <p><strong>Resumo:</strong></p>
                    <ul style={{paddingLeft:'20px', marginTop:'5px'}}>
                        <li>Cliente: Banco do Brasil</li>
                        <li>Total de Casos: <strong>{parsedData.length}</strong></li>
                    </ul>
                </div>

                <p>O sistema irá validar os nomes dos advogados e criar os casos automaticamente.</p>
                <div className={styles.stepActions}>
                    <button className={styles.prevButton} onClick={() => setCurrentStep(3)}>Voltar</button>
                    <button className={styles.nextButton} onClick={handleImport}>Iniciar Importação</button>
                </div>
            </section>
        )}

        {/* PASSO 5: Resultado */}
        {currentStep === 5 && (
            <section className={styles.contentCard}>
                <h2><FaPaperPlane /> Status Final</h2>
                {isImporting ? (
                    <div style={{textAlign:'center', padding:'2rem'}}>
                        <p>Processando... Por favor não feche a página.</p>
                    </div>
                ) : (
                    importResult && (
                        <div>
                            {importResult.success ? (
                                <div className={styles.resultSuccess}>
                                    <h3><FaCheckCircle /> Sucesso!</h3>
                                    <p>{importResult.message}</p>
                                </div>
                            ) : (
                                <div className={styles.resultError}>
                                    <h3><FaExclamationTriangle /> Atenção</h3>
                                    <p>{importResult.message}</p>
                                    {importResult.errors.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {importResult.errors.slice(0, 10).map((err, i) => (
                                                <li key={i}><strong>{err.line}:</strong> {err.errors.join(', ')}</li>
                                            ))}
                                            {importResult.errors.length > 10 && <li>... e mais erros no console.</li>}
                                        </ul>
                                    )}
                                </div>
                            )}
                            <div className={styles.stepActions}>
                                <button className={styles.prevButton} onClick={startNewImport}>Nova Importação</button>
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