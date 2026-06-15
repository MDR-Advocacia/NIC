<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\ActionObjectController;
use App\Http\Controllers\Api\AggressorLawyerController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CaseHistoryController;
use App\Http\Controllers\Api\CaseTagController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FilterPresetController;
use App\Http\Controllers\Api\ArchiveController;
use App\Http\Controllers\Api\DefendantController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\LegalCaseController;
use App\Http\Controllers\Api\OpposingLawyerController;
use App\Http\Controllers\Api\PlaintiffController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WebhookController;

Route::post('/webhooks/chatwoot', [WebhookController::class, 'receive']);
Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/chat/connection', [ChatController::class, 'getConnectionStatus']);
    Route::put('/chat/connection', [ChatController::class, 'updateConnection']);
    Route::delete('/chat/connection', [ChatController::class, 'disconnectConnection']);
    Route::get('/chat/conversations', [ChatController::class, 'getConversations']);
    Route::get('/chat/inboxes', [ChatController::class, 'getInboxes']);
    Route::get('/chat/templates', [ChatController::class, 'getTemplates']);
    Route::get('/chat/conversations/{conversationId}', [ChatController::class, 'getConversationMessages']);
    Route::post('/chat/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/chat/conversations/{conversationId}/assign', [ChatController::class, 'assignConversation']);
    Route::post('/chat/conversations/{conversationId}/resolve', [ChatController::class, 'resolveConversation']);
    Route::get('/chat/agents', [ChatController::class, 'getAccountAgents']);
    Route::post('/chat/conversations/{conversationId}/link', [ChatController::class, 'linkConversation']);
    Route::get('/chat/inboxes/{inboxId}/agents', [ChatController::class, 'getInboxAgents']);
    Route::post('/chat/inboxes/{inboxId}/agents', [ChatController::class, 'addAgentToInbox']);
    Route::get('/chat/contacts', [ChatController::class, 'getContacts']);
    Route::post('/chat/contacts', [ChatController::class, 'createContact']);
    Route::post('/chat/contacts/{contactId}/conversation', [ChatController::class, 'createConversationForContact']);
    Route::put('/chat/contacts/{contactId}', [ChatController::class, 'updateContact']);
    Route::delete('/chat/contacts/{contactId}', [ChatController::class, 'destroyContact']);

    Route::get('/cases/{legal_case}/conversation', [ChatController::class, 'getConversationByCase']);

    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/case-tags', [CaseTagController::class, 'index']);
    Route::delete('/case-tags/{caseTag}', [CaseTagController::class, 'destroy']);

    Route::get('/filter-presets', [FilterPresetController::class, 'index']);
    Route::post('/filter-presets', [FilterPresetController::class, 'store']);
    Route::delete('/filter-presets/{filterPreset}', [FilterPresetController::class, 'destroy']);
    Route::patch('/filter-presets/{filterPreset}/favorite', [FilterPresetController::class, 'toggleFavorite']);
    Route::patch('/filter-presets/{filterPreset}/global', [FilterPresetController::class, 'toggleGlobal']);
    Route::get('/users/operators', [UserController::class, 'operators']);
    Route::get('/users/indicators', [UserController::class, 'indicators']);
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::apiResource('users', UserController::class);
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('departments', DepartmentController::class)->only(['index', 'store']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    Route::get('/cases/export', [LegalCaseController::class, 'export']);
    Route::post('/cases/import', [LegalCaseController::class, 'bulkStore']);
    Route::post('/cases/sync-alcada', [LegalCaseController::class, 'syncAlcada']);
    Route::post('/cases/batch-update', [LegalCaseController::class, 'batchUpdate']);
    Route::post('/cases/{case}/indicate', [LegalCaseController::class, 'indicate']);
    Route::post('/cases/{case}/request-reanalysis', [LegalCaseController::class, 'requestReanalysis']);
    Route::post('/cases/{case}/formalize-agreement', [LegalCaseController::class, 'formalizeAgreement']);
    Route::get('/cases/{id}/agreement', [LegalCaseController::class, 'generateAgreement']);
    Route::apiResource('cases', LegalCaseController::class);

    Route::get('/cases/{case}/history', [CaseHistoryController::class, 'index']);
    Route::post('/cases/{case}/history', [CaseHistoryController::class, 'store']);

    Route::apiResource('aggressor-lawyers', AggressorLawyerController::class);
    Route::apiResource('opposing-lawyers', OpposingLawyerController::class);
    Route::apiResource('action-objects', ActionObjectController::class)->only(['index', 'store', 'update']);

    Route::get('/plaintiffs', [PlaintiffController::class, 'index']);
    Route::post('/plaintiffs', [PlaintiffController::class, 'store']);
    Route::get('/defendants', [DefendantController::class, 'index']);
    Route::post('/defendants', [DefendantController::class, 'store']);

    Route::get("/archives", [ArchiveController::class, "index"]);
    Route::post("/archives/archive", [ArchiveController::class, "archive"]);
    Route::post("/archives/unarchive", [ArchiveController::class, "unarchive"]);
    Route::get("/archives/archivable-preview", [ArchiveController::class, "archivablePreview"]);
    Route::post("/archives/compare-upload", [ArchiveController::class, "compareUpload"]);
});
