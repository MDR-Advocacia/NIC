<?php

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

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn(Request $request) => $request->user());

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('clients', ClientController::class);
    Route::apiResource('users', UserController::class);


    Route::apiResource('cases', LegalCaseController::class);
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
