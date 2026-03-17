<?php
// // 1. FORÇAR APP_KEY (Caso o Coolify limpe o .env)
// if (!env('APP_KEY')) {
//     config(['app.key' => 'base64:qMkktrXan9beMLstxLELl4g9uzftVF3HBETiDo+Beko=']);
// }

// // 2. TRATAR APENAS O 'OPTIONS' SEM ADICIONAR ORIGIN MANUAL
// // Isso vai permitir que o Nginx do Coolify mande o header dele sozinho
// if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
//     header('HTTP/1.1 204 No Content');
//     exit;
// }
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("Access-Control-Allow-Origin: https://lab-nic.mdradvocacia.com");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
    header('HTTP/1.1 200 OK');
    exit();
}
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\LegalCaseController;
use App\Http\Controllers\Api\AggressorLawyerController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\CaseHistoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\OpposingLawyerController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\PlaintiffController;
use App\Http\Controllers\Api\DefendantController;


// Webhook do Chatwoot (Sem autenticação pois vem do Chatwoot)
Route::post('/webhooks/chatwoot', [WebhookController::class, 'receive']);
//Rota para resolver uma conversa (Fechar a conversa no Chatwoot)
Route::post('/chat/conversations/{conversationId}/resolve', [ChatController::class, 'resolveConversation']);
// Autenticação e Recuperação de Senha
Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Auth Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    
    // --- CHAT & CHATWOOT ---
    // Listagem de conversas (Usada pelo seu InboxPage.jsx)
    Route::get('/chat/conversations', [ChatController::class, 'getConversations']);
    Route::get('/chat/inboxes', [ChatController::class, 'getInboxes']);
    Route::get('/chat/templates', [ChatController::class, 'getTemplates']);
    // Gestão de conversas específicas
    Route::get('/chat/conversations/{conversationId}', [ChatController::class, 'getConversationMessages']);
    Route::post('/chat/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/chat/conversations/{conversationId}/link', [ChatController::class, 'linkConversation']);
    //Lista e criação de contatos (Clientes) no Chatwoot
    Route::get('/chat/contacts', [ChatController::class, 'getContacts']);
    Route::post('/chat/contacts', [ChatController::class, 'createContact']);
    
    // Vínculo com Processos (Legal Cases)
    Route::get('/cases/{legal_case}/conversation', [ChatController::class, 'getConversationByCase']);

    // --- USUÁRIO & PERFIL ---
    Route::get('/user', fn(Request $request) => $request->user());
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- DASHBOARD & CORE ---
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::apiResource('users', UserController::class);
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('departments', DepartmentController::class)->only(['index', 'store']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // --- PROCESSOS (CASES) ---
    Route::get('/cases/export', [LegalCaseController::class, 'export']);
    Route::post('/cases/import', [LegalCaseController::class, 'bulkStore']);
    Route::post('/cases/batch-update', [LegalCaseController::class, 'batchUpdate']); 
    Route::get('/cases/{id}/agreement', [LegalCaseController::class, 'generateAgreement']);
    Route::apiResource('cases', LegalCaseController::class);

    // --- HISTÓRICO DE CASOS ---
    Route::get('/cases/{case}/history', [CaseHistoryController::class, 'index']);
    Route::post('/cases/{case}/history', [CaseHistoryController::class, 'store']);

    // --- AUXILIARES (ADVOGADOS, AUTORES, RÉUS) ---
    Route::apiResource('aggressor-lawyers', AggressorLawyerController::class);
    Route::apiResource('opposing-lawyers', OpposingLawyerController::class);
    
    Route::get('/plaintiffs', [PlaintiffController::class, 'index']);
    Route::post('/plaintiffs', [PlaintiffController::class, 'store']);
    Route::get('/defendants', [DefendantController::class, 'index']);
    Route::post('/defendants', [DefendantController::class, 'store']);
});