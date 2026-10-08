// Esqueleto de carregamento (padrão Flow): blocos com brilho no lugar do texto "Carregando...".

import React from 'react';
import styles from '../styles/PageSkeleton.module.css';

export const SkeletonBlock = ({ height = 16, width = '100%', radius }) => (
    <div className={styles.block} style={{ height, width, borderRadius: radius }} />
);

// variant "dashboard": faixa de KPIs + gráficos; "table": filtros + linhas de tabela
const PageSkeleton = ({ variant = 'table', rows = 8, label = 'Carregando' }) => (
    <div className={styles.wrapper} aria-busy="true" aria-label={label}>
        {variant === 'dashboard' ? (
            <>
                <div className={styles.kpiRow}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className={styles.card}>
                            <SkeletonBlock height={10} width="55%" />
                            <SkeletonBlock height={26} width="70%" />
                            <SkeletonBlock height={10} width="85%" />
                        </div>
                    ))}
                </div>
                <div className={styles.chartRow}>
                    <div className={styles.card}><SkeletonBlock height={14} width="40%" /><SkeletonBlock height={260} radius={16} /></div>
                    <div className={styles.card}><SkeletonBlock height={14} width="40%" /><SkeletonBlock height={260} radius={16} /></div>
                </div>
            </>
        ) : (
            <div className={styles.card}>
                <SkeletonBlock height={14} width="30%" />
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className={styles.tableRow}>
                        <SkeletonBlock height={12} width="18%" />
                        <SkeletonBlock height={12} width="22%" />
                        <SkeletonBlock height={12} width="26%" />
                        <SkeletonBlock height={12} width="14%" />
                    </div>
                ))}
            </div>
        )}
    </div>
);

export default PageSkeleton;
