import React, { useState, useEffect } from 'react';

const InboxPage = () => {
  // Configura a URL base. 
  // Se estiver rodando no localhost (teste), usa o link de teste.
  // Se estiver em produção, usa o link oficial.
  // Configura a URL base com a conta 1 e a caixa de entrada 4
  // Configuração direta para a caixa de entrada oficial
const chatwootUrl = 'https://chat.mdradvocacia.com/app/login';

  const [isLoading, setIsLoading] = useState(true);

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Título ou Cabeçalho (Opcional) */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #eee', background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Caixa de Entrada Unificada</h2>
      </div>

      {/* Área de Carregamento */}
      {isLoading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          background: '#f5f5f5' 
        }}>
          <span>Carregando Chatwoot...</span>
        </div>
      )}

      {/* O Iframe Mágico */}
      <iframe
        src={chatwootUrl}
        title="Chatwoot Dashboard"
        width="100%"
        height="100%"
        style={{ 
          border: 'none', 
          display: isLoading ? 'none' : 'block',
          flex: 1 
        }}
        // Permissões cruciais para áudio e anexo funcionarem dentro do NIC
        allow="camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

export default InboxPage;