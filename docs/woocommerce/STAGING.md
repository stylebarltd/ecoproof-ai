# Local WooCommerce staging (no live shop involved)

Throw-away WordPress + WooCommerce + Mailpit in Docker, wired to the app on `localhost:3111`. Used to test the full path before anything goes near superbee.me.

```bash
docker network create wootest; docker volume create woo-wpdata
docker run -d --name woo-db   --network wootest -e MARIADB_DATABASE=wp -e MARIADB_USER=wp -e MARIADB_PASSWORD=wp -e MARIADB_ROOT_PASSWORD=root mariadb:11
docker run -d --name woo-mail --network wootest -p 8025:8025 axllent/mailpit
docker run -d --name woo-wp   --network wootest --add-host host.docker.internal:host-gateway -p 8088:80 \
  -e WORDPRESS_DB_HOST=woo-db -e WORDPRESS_DB_USER=wp -e WORDPRESS_DB_PASSWORD=wp -e WORDPRESS_DB_NAME=wp -v woo-wpdata:/var/www/html wordpress:latest
# wp-cli: docker run --rm --network wootest -u 33:33 -e WORDPRESS_DB_* ... -v woo-wpdata:/var/www/html wordpress:cli wp <cmd>
```

1. `wp core install`, `wp plugin install woocommerce --activate`, `wp theme install storefront`, create a `storefront-child` theme.
2. Copy `staging-local.php` into `wp-content/mu-plugins/` (sends mail to Mailpit; lets WordPress call `host.docker.internal`, which it blocks by default).
3. Paste the `themeSnippet` from `GET /api/stamp-places/superbee/woo` into the child theme's `functions.php`.
4. Create the webhook (`wp wc webhook create --topic=order.updated --delivery_url=http://host.docker.internal:3111/api/woo/webhook/superbee --secret=<secret> --status=active --user=1`).
5. Create an order, set it to `completed`, run `wp action-scheduler run` (webhook delivery is async), open Mailpit on :8025.

Notes: the WordPress image tag `6` is too old for current WooCommerce (needs WP 7), use `latest`. On a real shop WP-Cron / Action Scheduler delivers webhooks by itself.
