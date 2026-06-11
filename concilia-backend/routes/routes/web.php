<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'nic-api',
        'status' => 'ok',
    ]);
});
