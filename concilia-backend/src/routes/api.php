<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
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
// Rota para o Chatwoot
Route::post('/webhooks/chatwoot', [WebhookController::class, 'receive']);
Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn(Request $request) => $request->user());

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('clients', ClientController::class);
    Route::apiResource('users', UserController::class);


    Route::apiResource('cases', LegalCaseController::class);
    // --- ROTA NOVA PARA AÇÃO EM LOTE ---
    Route::post('/cases/batch-update', [LegalCaseController::class, 'batchUpdate']); 
    // -----------------------------------
    Route::get('/chatwoot-proxy', function () {
        $token = 'gG4gX1KUxE4NrFtJjUynZw2c'; 
        
        try {
            $response = Http::withHeaders([
                'api_access_token' => $token,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->get("https://chat.mdradvocacia.com/api/v1/accounts/1/conversations", [
                'status' => 'all'
            ]);

            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Falha ao conectar com Chatwoot'], 500);
        }
    });
    Route::apiResource('aggressor-lawyers', AggressorLawyerController::class);
    Route::apiResource('departments', DepartmentController::class)->only(['index', 'store']);

    Route::get('/cases/export', [LegalCaseController::class, 'export']);
    Route::post('/cases/import', [LegalCaseController::class, 'bulkStore']);

    // --- (Geração de PDF) ---
    Route::get('/cases/{id}/agreement', [LegalCaseController::class, 'generateAgreement']);
    // ----------------------------------------

    Route::get('/cases/{case}/history', [CaseHistoryController::class, 'index']);
    Route::post('/cases/{case}/history', [CaseHistoryController::class, 'store']);

    Route::get('/chat/unassigned', [ChatController::class, 'getUnassignedConversations']);
    Route::post('/chat/conversations/{conversationId}/link', [ChatController::class, 'linkConversation']);

    Route::get('/chat/conversations/{conversationId}', [ChatController::class, 'getConversationMessages']);
    Route::post('/chat/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage']);

    Route::get('/cases/{legal_case}/conversation', [ChatController::class, 'getConversationByCase']);

    // Rota de Logs 
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Rotas de Tabelas Auxiliares
    Route::apiResource('opposing-lawyers', OpposingLawyerController::class);

    
    Route::get('/plaintiffs', [App\Http\Controllers\Api\PlaintiffController::class, 'index']);
    Route::post('/plaintiffs', [App\Http\Controllers\Api\PlaintiffController::class, 'store']);

    Route::get('/defendants', [App\Http\Controllers\Api\DefendantController::class, 'index']);
    Route::post('/defendants', [App\Http\Controllers\Api\DefendantController::class, 'store']);
    
});