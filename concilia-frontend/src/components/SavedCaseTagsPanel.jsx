import React from 'react';
import { FaCheck, FaPlus, FaTrashAlt } from 'react-icons/fa';
import { normalizeCaseTag } from '../constants/caseTags';
import styles from '../styles/SavedCaseTagsPanel.module.css';

const toTagKey = (tag) => normalizeCaseTag(tag)?.text?.toLocaleLowerCase('pt-BR') || '';

const hexToRgba = (color, opacity) => {
  const normalizedColor = String(color || '').trim();
  const match = normalizedColor.match(/^#([0-9a-f]{6})$/i);

  if (!match) {
    return normalizedColor || `rgba(239, 68, 68, ${opacity})`;
  }

  const [, value] = match;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const SavedCaseTagsPanel = ({
  tags,
  onSelectTag,
  onDeleteTag,
  canDelete = false,
  selectionMode = 'append',
  selectedValue = '',
  selectedValues = [],
  title = 'Etiquetas salvas',
  subtitle = '',
  emptyMessage = 'Nenhuma etiqueta salva disponível.',
  compact = false,
}) => {
  const normalizedTags = (Array.isArray(tags) ? tags : []).reduce((accumulator, currentTag) => {
    const normalizedTag = normalizeCaseTag(currentTag);
    if (!normalizedTag) {
      return accumulator;
    }

    const normalizedKey = toTagKey(normalizedTag);
    if (accumulator.some((tag) => toTagKey(tag) === normalizedKey)) {
      return accumulator;
    }

    accumulator.push({
      ...normalizedTag,
      id: currentTag?.id ?? null,
    });

    return accumulator;
  }, []);
  const selectedKeys = new Set(
    (Array.isArray(selectedValues) ? selectedValues : [])
      .map((tag) => toTagKey(tag))
      .filter(Boolean)
  );
  const selectedFilterKey = toTagKey(selectedValue);

  if (normalizedTags.length === 0) {
    return (
      <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
        {(title || subtitle) && (
          <div className={styles.header}>
            {title ? <h4 className={styles.title}>{title}</h4> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        )}
        <p className={styles.emptyState}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title ? <h4 className={styles.title}>{title}</h4> : null}
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      )}

      <div className={styles.grid}>
        {normalizedTags.map((tag) => {
          const tagKey = toTagKey(tag);
          const isActive = selectionMode === 'filter'
            ? selectedFilterKey === tagKey
            : selectedKeys.has(tagKey);

          const tagStyle = {
            '--tag-color': tag.color,
            '--tag-color-soft': hexToRgba(tag.color, compact ? 0.12 : 0.14),
            '--tag-color-border': hexToRgba(tag.color, 0.28),
            '--tag-color-strong': hexToRgba(tag.color, 0.88),
          };

          return (
            <div
              key={`${tag.id || tag.text}-${tag.color}`}
              className={`${styles.tagCard} ${isActive ? styles.tagCardActive : ''}`}
              style={tagStyle}
            >
              <button
                type="button"
                className={styles.tagButton}
                onClick={() => onSelectTag?.(tag)}
                aria-pressed={isActive}
              >
                <span className={styles.tagIcon}>
                  {selectionMode === 'filter' ? (isActive ? <FaCheck /> : <FaPlus />) : (isActive ? <FaCheck /> : <FaPlus />)}
                </span>
                <span className={styles.tagText}>{tag.text}</span>
              </button>

              {canDelete && tag.id && onDeleteTag ? (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTag(tag);
                  }}
                  title={`Excluir etiqueta ${tag.text}`}
                  aria-label={`Excluir etiqueta ${tag.text}`}
                >
                  <FaTrashAlt />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SavedCaseTagsPanel;
