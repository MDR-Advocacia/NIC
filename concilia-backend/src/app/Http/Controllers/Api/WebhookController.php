<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function receive(Request $request)
    {
        // Isso vai aparecer no seu tail -f
        Log::info('--- WEBHOOK DO CHATWOOT RECEBIDO COM SUCESSO ---');
        Log::info(json_encode($request->all()));

        return response()->json(['status' => 'ok'], 200);
    }
}