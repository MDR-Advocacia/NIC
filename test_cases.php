<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();
$reasons = App\Models\ReanalysisReason::all();
echo count($reasons) . " reanalysis reasons:\n";
foreach ($reasons as $r) echo "  - " . $r->name . "\n";
