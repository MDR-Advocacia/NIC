import React from 'react';

const InboxPage = () => {
  // Link de login para garantir o acesso inicial
  const chatwootLoginUrl = "https://chat.mdradvocacia.com/app/login";

  return (
    <div style={{ 
      width: '100%', 
      height: 'calc(100vh - 100px)', // Ajuste esse valor conforme a altura do seu menu superior
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      backgroundColor: '#fff' 
    }}>
      <iframe
        src={chatwootLoginUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Atendimento MDR"
        // Permissões necessárias para o chat funcionar bem (notificações e anexos)
        allow="camera; microphone; clipboard-read; clipboard-write; display-capture"
      />
    </div>
  );
};

export default InboxPage;