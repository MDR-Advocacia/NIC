<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthcheckTest extends TestCase
{
    public function test_root_endpoint_returns_a_healthy_api_payload(): void
    {
        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertJson([
                'service' => 'nic-api',
                'status' => 'ok',
            ]);
    }

    public function test_framework_health_endpoint_returns_success(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_login_preflight_returns_cors_headers_for_the_production_frontend(): void
    {
        $response = $this->call('OPTIONS', '/api/login', [], [], [], [
            'HTTP_ORIGIN' => 'https://nic.mdradvocacia.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type, authorization',
        ]);

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://nic.mdradvocacia.com')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $this->assertStringContainsString(
            'POST',
            (string) $response->headers->get('Access-Control-Allow-Methods')
        );
    }
}
