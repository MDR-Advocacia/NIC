import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '../styles/CaseCard.module.css';
import { FaUser, FaLandmark, FaGavel, FaFileAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { normalizeCaseTags } from '../constants/caseTags';

const getBadgeInitials = (value, maxLetters = 3) =>
  String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('')
    .slice(0, maxLetters);

const getDisplayValue = (value, fallback = 'Nao informado') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }
  if (typeof value === 'object') {
    return value.name || value.nome || fallback;
  }
  return fallback;
};

const getResponsibleName = (legalCase) =>
  getDisplayValue(
    legalCase?.agreement_checklist_data?.indication_checklist?.assigned_operator || legalCase?.lawyer,
    'Sem responsavel'
  );

const getIndicatorName = (legalCase) => {
  const indicator = legalCase?.indicator
    || legalCase?.agreement_checklist_data?.indication_checklist?.indicator
    || legalCase?.agreement_checklist_data?.indication_checklist?.completed_by;

  return getDisplayValue(indicator, '');
};

const getTagTextColor = (backgroundColor) => {
  const hexColor = String(backgroundColor || '').replace('#', '').trim();

  if (!/^[0-9a-fA-F]{6}$/.test(hexColor)) {
    return '#ffffff';
  }

  const red = parseInt(hexColor.slice(0, 2), 16);
  const green = parseInt(hexColor.slice(2, 4), 16);
  const blue = parseInt(hexColor.slice(4, 6), 16);
  const brightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

  return brightness > 150 ? '#111827' : '#ffffff';
};

const CaseCardBody = ({
  legalCase,
  onClick,
  setNodeRef,
  style,
  attributes = {},
  listeners = {},
  canIndicate = false,
  onIndicate,
}) => {
  const lastUpdate = new Date(legalCase.updated_at);
  const today = new Date();
  const diffTime = Math.abs(today - lastUpdate);
  const daysSinceUpdate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isDelayed = daysSinceUpdate > 5;

  const alcadaValue = parseFloat(legalCase.original_value);
  const indicatorName = getIndicatorName(legalCase);
  const caseTags = normalizeCaseTags(legalCase.tags);

  let economyPercentage = null;
  const originalValue = parseFloat(legalCase.original_value);
  const agreementValue = parseFloat(legalCase.agreement_value);

  if (originalValue > 0 && agreementValue > 0) {
    economyPercentage = ((originalValue - agreementValue) / originalValue) * 100;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`${styles.card} ${isDelayed ? styles.cardDelayed : ''}`}
        onClick={onClick}
      >
        <div className={styles.header} {...listeners}>
          <span className={styles.caseNumber}>{legalCase.case_number}</span>

          <div className={styles.headerMeta}>
            {isDelayed && (
              <span className={styles.delayedTag} title={`Este caso nao e atualizado ha ${daysSinceUpdate} dias`}>
                <FaExclamationTriangle /> {daysSinceUpdate}d parado
              </span>
            )}
          </div>
        </div>

        {caseTags.length > 0 && (
          <div className={styles.tagsStrip}>
            {caseTags.map((tag) => (
              <span
                key={`${tag.text}-${tag.color}`}
                className={styles.tagChip}
                style={{
                  backgroundColor: tag.color,
                  color: getTagTextColor(tag.color),
                }}
                title={tag.text}
              >
                {tag.text}
              </span>
            ))}
          </div>
        )}

        <div className={styles.body}>
          <div className={styles.infoRow}><FaUser /><span>{getDisplayValue(legalCase.opposing_party)}</span></div>
          <div className={styles.infoRow}><FaFileAlt /><span>{getDisplayValue(legalCase.action_object)}</span></div>

          <div className={styles.valueRow}>
            <span>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(alcadaValue) ? alcadaValue : 0)}
            </span>
            {economyPercentage !== null && (
              <span className={economyPercentage >= 0 ? styles.economyPercentage : styles.economyPercentageNegative}>
                {economyPercentage >= 0 ? '↓' : '↑'} {Math.abs(economyPercentage).toFixed(1)}%
              </span>
            )}
          </div>

          <div className={styles.infoRow}><FaLandmark /><span>{legalCase.client?.name}</span></div>
          <div className={styles.infoRow}><FaGavel /><span>Responsavel: {getResponsibleName(legalCase)}</span></div>
          {indicatorName && (
            <div className={styles.infoRow}><FaUser /><span>Indicador: {indicatorName}</span></div>
          )}

          <div className={`${styles.infoRow} ${isDelayed ? styles.textDelayed : ''}`}>
            <FaClock />
            <span>
              {isDelayed ? 'Atencao: ' : ''}
              Atualizado em {lastUpdate.toLocaleDateString('pt-BR')}
            </span>
          </div>

          {canIndicate && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (onIndicate) {
                  onIndicate(legalCase);
                }
              }}
              className={styles.indicateButton}
            >
              Indicar Caso para acordo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SortableCaseCard = (props) => {
  const { id, legalCase } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { status: legalCase.status, caseData: legalCase } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <CaseCardBody
      {...props}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  );
};

const StaticCaseCard = (props) => (
  <CaseCardBody
    {...props}
    setNodeRef={undefined}
    style={undefined}
  />
);

const CaseCard = ({ enableDrag = true, ...props }) =>
  enableDrag ? <SortableCaseCard {...props} /> : <StaticCaseCard {...props} />;

export default CaseCard;
