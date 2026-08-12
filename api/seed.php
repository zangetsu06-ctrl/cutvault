<?php
require_once __DIR__ . '/db.php';

$username = 'admin';
$email = 'admin@cutvault.com';
$password = 'admin123';

// Generate dynamic bcrypt hash using PHP engine
$hash = password_hash($password, PASSWORD_BCRYPT);

try {
    $stmt = $pdo->prepare("
        INSERT INTO users (username, email, password, role) 
        VALUES (:u, :e, :p, 'admin') 
        ON DUPLICATE KEY UPDATE password = :p_update
    ");
    $stmt->execute([
        'u' => $username,
        'e' => $email,
        'p' => $hash,
        'p_update' => $hash
    ]);

    echo "SUCCESS: Admin account reset! Username: admin | Password: admin123";
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage();
}