<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceCors
{
    public function handle(Request $request, Closure $next)
    {
        $allowedOrigins = array_values(array_filter(config('cors.allowed_origins', [
            'https://lab-nic.mdradvocacia.com',
            'http://localhost:3000',
            'http://localhost:5173',
        ])));

        $origin = $request->headers->get('Origin');
        $allowOrigin = in_array($origin, $allowedOrigins, true)
            ? $origin
            : ($allowedOrigins[0] ?? 'https://lab-nic.mdradvocacia.com');
        $allowHeaders = $request->headers->get(
            'Access-Control-Request-Headers',
            'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-XSRF-TOKEN, X-CSRF-TOKEN'
        );

        $headers = [
            'Access-Control-Allow-Origin' => $allowOrigin,
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => $allowHeaders,
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => '86400',
            'Vary' => 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
        ];

        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);

            foreach ($headers as $header => $value) {
                $response->headers->set($header, $value);
            }

            return $response;
        }

        $response = $next($request);

        foreach ($headers as $header => $value) {
            $response->headers->set($header, $value);
        }

        return $response;
    }
}
