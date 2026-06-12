<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ImportSofiaKnowledgeBase extends Command
{
    protected $signature = 'sofia:import-kb {path}';
    protected $description = 'Importa JSONL depurado de SofIA a la base de conocimiento';

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! file_exists($path)) {
            $this->error("No existe el archivo: {$path}");
            return self::FAILURE;
        }

        $count = 0;

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $row = json_decode($line, true);

            if (! $row || empty($row['id']) || empty($row['contenido'])) {
                $this->warn("Registro inválido omitido.");
                continue;
            }

            // TODO:
            // 1. upsert por id
            // 2. guardar skill, tipo_documento, categoria, titulo, contenido, metadata
            // 3. generar embedding sobre contenido + titulo
            // 4. asociar filtros metadata.skill/categoria/audiencia

            $count++;
        }

        $this->info("Registros procesados: {$count}");
        return self::SUCCESS;
    }
}
