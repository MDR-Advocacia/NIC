import React from 'react';
import { FaWhatsapp, FaExternalLinkAlt, FaInfoCircle } from 'react-icons/fa';

const InboxPage = () => {
  const CHATWOOT_URL = "https://chat.mdradvocacia.com/app/accounts/1/inbox/4";

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: '15px', 
        padding: '40px', 
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        border: '1px solid #eef0f2'
      }}>
        <div style={{ 
          background: '#e7f9ed', 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <FaWhatsapp size={40} color="#25D366" />
        </div>

        <h2 style={{ color: '#1a1d21', marginBottom: '10px', fontSize: '24px' }}>
          Central de Atendimento WhatsApp
        </h2>
        
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
          Para garantir a segurança e a melhor performance das conversas da <strong>MDR Advocacia</strong>, 
          o atendimento é realizado em nossa plataforma dedicada.
        </p>

        <div style={{ 
          background: '#f8fafc', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '15px',
          textAlign: 'left'
        }}>
          <FaInfoCircle color="#3b82f6" size={20} style={{ marginTop: '3px' }} />
          <span style={{ color: '#475569', fontSize: '14px' }}>
            Ao clicar no botão abaixo, a central de mensagens será aberta em uma aba segura. 
            Você continuará logado no NIC simultaneamente.
          </span>
        </div>

        <button 
          onClick={() => window.open(CHATWOOT_URL, '_blank')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Acessar Conversas <FaExternalLinkAlt size={16} />
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '12px' }}>
        MDR Advocacia - Sistema de Gestão Interna (NIC)
      </p>
    </div>
  );
};

export default InboxPage;