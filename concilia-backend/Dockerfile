# Usar a imagem oficial do PHP 8.2 com FPM
FROM php:8.2-fpm

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    git unzip zip curl libpng-dev libjpeg-dev libfreetype6-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd xml

# Instalar o Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# --- AJUSTE AQUI: Usar /var/www/html que é o padrão do Nginx ---
WORKDIR /var/www/html

# Copiar arquivos de dependência
COPY src/composer.json src/composer.lock ./
# Copiar o código da subpasta src para a raiz do WORKDIR
COPY src/. .

# Remove caches do Laravel gerados fora da imagem para evitar
# referências a providers de dependências de desenvolvimento.
RUN rm -f bootstrap/cache/*.php

# Instalar dependências
RUN [ -f .env ] || cp .env.example .env
RUN composer install --no-interaction --no-plugins --no-scripts --prefer-dist --no-dev
# Mudamos o dono de TUDO para www-data antes de trocar de usuário
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Otimiza o autoloader
# RUN composer dump-autoload --optimize



# --- AJUSTE DE PERMISSÕES DEFINITIVO ---


# Expõe a porta 9000
EXPOSE 9000
CMD ["php-fpm"]
