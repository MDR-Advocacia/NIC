<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CaseHistoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(LegalCase $case)
    {
        // Acessa o histórico usando a relação que você criou ('histories')
        $history = $case->histories()->with('user:id,name')->get();

        return response()->json($history);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, LegalCase $case)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:2000',
           
            'event_type' => 'required|string|max:50',
        ]);

        $historyEntry = $case->histories()->create([
            'user_id' => Auth::id(),
            'description' => $validated['description'],
            'event_type' => $validated['event_type'],
        ]);
        
        $historyEntry->load('user:id,name');

        return response()->json($historyEntry, 201);
    }
}