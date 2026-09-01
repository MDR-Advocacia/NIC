<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CaseAttachment extends Model
{
    use HasFactory;

    public const TYPE_LEGAL_OPINION = 'legal_opinion';

    protected $fillable = [
        'legal_case_id',
        'type',
        'filename',
        'mime_type',
        'size',
        'content',
        'uploaded_by_user_id',
    ];

    protected $hidden = [
        'content',
    ];

    public function legalCase()
    {
        return $this->belongsTo(LegalCase::class);
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
