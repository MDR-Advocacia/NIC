import React from 'react';
import { FaPaperclip } from 'react-icons/fa';

const boxStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    marginTop: '0.5rem',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
};

const questionStyle = { fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' };
const radioRowStyle = { display: 'flex', gap: '1.25rem', fontSize: '0.9rem', color: '#1f2937' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' };
const checkLabelStyle = { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#1f2937', cursor: 'pointer' };
const helpStyle = { fontSize: '0.78rem', color: '#6b7280', margin: 0 };

const AgreementComplianceFields = ({
    fraudAnswer,
    onFraudAnswerChange,
    portalConfirmed,
    onPortalConfirmedChange,
    file,
    onFileChange,
    hasExistingOpinion = false,
    disabled = false,
    idPrefix = 'agreement-compliance',
}) => (
    <div style={boxStyle}>
        <span style={questionStyle}>O acordo envolve matéria de golpe ou seguro prestamista? *</span>
        <div style={radioRowStyle} role="radiogroup" aria-label="Acordo envolve golpe ou seguro prestamista">
            <label style={radioLabelStyle}>
                <input
                    type="radio"
                    name={`${idPrefix}-fraud`}
                    value="sim"
                    checked={fraudAnswer === 'sim'}
                    onChange={() => onFraudAnswerChange('sim')}
                    disabled={disabled}
                />
                Sim
            </label>
            <label style={radioLabelStyle}>
                <input
                    type="radio"
                    name={`${idPrefix}-fraud`}
                    value="nao"
                    checked={fraudAnswer === 'nao'}
                    onChange={() => onFraudAnswerChange('nao')}
                    disabled={disabled}
                />
                Não
            </label>
        </div>

        {fraudAnswer === 'sim' && (
            <>
                <label style={checkLabelStyle}>
                    <input
                        type="checkbox"
                        checked={portalConfirmed}
                        onChange={(e) => onPortalConfirmedChange(e.target.checked)}
                        disabled={disabled}
                        style={{ marginTop: '2px' }}
                    />
                    Confirmo que o parecer jurídico foi anexado no portal do banco. *
                </label>

                <div>
                    <label
                        htmlFor={`${idPrefix}-file`}
                        style={{ ...checkLabelStyle, fontWeight: 600 }}
                    >
                        <FaPaperclip style={{ marginTop: '2px', flexShrink: 0 }} />
                        Anexe o parecer aqui também {hasExistingOpinion ? '(opcional — já existe parecer anexado)' : '*'}
                    </label>
                    <input
                        id={`${idPrefix}-file`}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                        disabled={disabled}
                        style={{ marginTop: '0.35rem', fontSize: '0.85rem', width: '100%' }}
                    />
                    <p style={helpStyle}>
                        PDF, Word ou imagem, até 10 MB.
                        {hasExistingOpinion && ' Já existe um parecer anexado a este caso; envie apenas se quiser substituí-lo pela versão mais recente.'}
                        {file ? ` Selecionado: ${file.name}` : ''}
                    </p>
                </div>
            </>
        )}
    </div>
);

export default AgreementComplianceFields;
