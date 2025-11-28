# Usar a imagem oficial do PHP 8.2 com FPM
FROM php:8.2-fpm

# Instalar dependências do sistema e extensões PHP necessárias para o Laravel
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    zip \
    curl \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd xml

# Instalar o Composer (gerenciador de pacotes do PHP)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Definir o diretório de trabalho
WORKDIR /var/www

# Copiar arquivos de dependência primeiro para aproveitar o cache do Docker
COPY src/composer.json src/composer.lock ./

# Instalar dependências do Composer
RUN composer install --no-interaction --no-plugins --no-scripts --prefer-dist

# Copiar o restante do código da aplicação
COPY src/. .

# Mudar o dono dos arquivos para o usuário do www-data para corrigir permissões
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copiar o restante do código da aplicação
COPY src/. .

# Gera o autoloader otimizado do Laravel
RUN composer dump-autoload --optimize

# Mudar o dono dos arquivos para o usuário do www-data para corrigir permissões
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# A aplicação será executada como www-data
USER www-data

# Expõe a porta 9000 e inicia o PHP-FPM
EXPOSE 9000
CMD ["php-fpm"]