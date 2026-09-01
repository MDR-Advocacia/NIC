import apiClient from '../api';

export const uploadLegalOpinion = async (caseId, file, token) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('portal_confirmed', '1');

    await apiClient.post(`/cases/${caseId}/legal-opinion`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
};

export const downloadLegalOpinion = async (caseId, filename, token) => {
    const response = await apiClient.get(`/cases/${caseId}/legal-opinion`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'parecer-juridico.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const validateComplianceBeforeClose = ({ fraudAnswer, portalConfirmed, file, hasExistingOpinion }) => {
    if (fraudAnswer !== 'sim' && fraudAnswer !== 'nao') {
        return 'Informe se o acordo envolve matéria de golpe ou seguro prestamista.';
    }

    if (fraudAnswer === 'sim') {
        if (!portalConfirmed) {
            return 'Confirme que o parecer foi anexado no portal do banco.';
        }
        if (!file && !hasExistingOpinion) {
            return 'Anexe o parecer jurídico para fechar o acordo.';
        }
    }

    return null;
};
