/**
 * Aplica a máscara do padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
 * Ex: 0855831-29.2025.8.20.5001
 */
export const maskProcessNumber = (value) => {
    if (!value) return '';
    
    return value
        .replace(/\D/g, '') // Remove tudo o que não é dígito
        .replace(/(\d{7})(\d)/, '$1-$2')       // Coloca o traço após os 7 primeiros
        .replace(/(\d{7}-\d{2})(\d)/, '$1.$2') // Ponto após o dígito verificador
        .replace(/(\d{7}-\d{2}\.\d{4})(\d)/, '$1.$2') // Ponto após o ano
        .replace(/(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, '$1.$2') // Ponto após o órgão (J)
        .replace(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, '$1.$2') // Ponto após o tribunal (TR)
        .substring(0, 25); // Limita ao tamanho máximo do padrão formatado
};