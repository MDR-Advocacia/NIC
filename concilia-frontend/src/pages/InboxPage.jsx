// import React, { useState, useEffect } from 'react';

// const InboxPage = () => {
//   const [conversas, setConversas] = useState([]);
//   const [carregando, setCarregando] = useState(true);

//   // Substitua pela Chave API da sua imagem image_60b0b0.png
//   const API_KEY = "EAALPQHvqNkQBPzH75IZB2kBZCulsIQoplb4u3mCffixPvZBdL1jqW67TI5M0yb3HizO37WR6cptwHe3Uw7e4hZCQrZAOmE4LeyDN4wumHBp71BG9MAJCz5cXtGQTx2H8Ka38UtHGjZAkZB9onAhaHEa1cAx8l84LX2jDqOJsY2Ei9PrQzcjKdQxpqroRsVCoeLcrwZDZD"; 
//   const ACCOUNT_ID = "1";

//   useEffect(() => {
//     fetch(`https://chat.mdradvocacia.com/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
//       method: 'GET',
//       headers: {
//         'api_access_token': API_KEY,
//         'Content-Type': 'application/json'
//       }
//     })
//     .then(res => res.json())
//     .then(data => {
//       setConversas(data.payload);
//       setCarregando(false);
//     })
//     .catch(err => console.error("Erro ao espelhar chat:", err));
//   }, []);

//   if (carregando) return <div>Carregando mensagens do WhatsApp...</div>;

//   return (
//     <div style={{ padding: '20px' }}>
//       <h2>Atendimento WhatsApp MDR</h2>
//       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//         {conversas.map(chat => (
//           <div key={chat.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
//             <strong>{chat.meta.sender.name}</strong>
//             <p style={{ color: '#666' }}>{chat.messages[0]?.content || "Sem mensagens recentes"}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default InboxPage;
import React from 'react';
import { FaExternalLinkAlt, FaWhatsapp } from 'react-icons/fa';

const InboxPage = () => {
  const abrirChat = () => {
    window.open('https://chat.mdradvocacia.com/app/accounts/1/inbox/4', '_blank');
  };

  return (
    <div style={{ 
      height: '80vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f8f9fa' 
    }}>
      <div style={{ 
        padding: '40px', 
        backgroundColor: '#fff', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center' 
      }}>
        <FaWhatsapp size={50} color="#25D366" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Central de Atendimento</h2>
        <p style={{ color: '#666', marginBottom: '30px', maxWidth: '300px' }}>
          Clique no botão abaixo para gerenciar as conversas do WhatsApp MDR em uma nova janela segura.
        </p>
        
        <button 
          onClick={abrirChat}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold'
          }}
        >
          Acessar Chat Agora <FaExternalLinkAlt size={14} />
        </button>
      </div>
    </div>
  );
};

export default InboxPage;