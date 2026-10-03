<?php
// STAGING ONLY: send mail to Mailpit, and let webhooks reach the dev machine (WordPress blocks private hosts by default).
add_action('phpmailer_init', function ($m) { $m->isSMTP(); $m->Host = 'woo-mail'; $m->Port = 1025; $m->SMTPAuth = false; $m->SMTPAutoTLS = false; });
add_filter('http_request_host_is_external', function ($ok, $host) { return $host === 'host.docker.internal' ? true : $ok; }, 10, 2);
add_filter('http_allowed_safe_ports', function ($ports) { $ports[] = 3111; return $ports; });
