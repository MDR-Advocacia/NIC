<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->softDeletes();
            $table->string('import_batch_id', 36)->nullable()->index()
                ->comment('Lote de importacao que criou o caso (permite desfazer a subida)');
        });

        Schema::create('import_batches', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('file_name')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->timestamp('undone_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropIndex(['import_batch_id']);
            $table->dropColumn(['import_batch_id', 'deleted_at']);
        });
    }
};
