<?php
// Session Configuration
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 0);
ini_set('session.gc_maxlifetime', 86400);
session_set_cookie_params(86400);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CORS Headers
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: $_POST;
$action = strtolower($_GET['action'] ?? $input['action'] ?? '');

switch ($action) {
    // ==================== SIGNUP ====================
    case 'signup':
        $username = trim($input['username'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$username || !$email || !$password) {
            http_response_code(400);
            echo json_encode(["error" => "All fields are required."]);
            exit();
        }

        if (strlen($username) < 3 || is_numeric($username)) {
            http_response_code(400);
            echo json_encode(["error" => "Username must be at least 3 characters and contain letters."]);
            exit();
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "Please enter a valid email address."]);
            exit();
        }

        $hasUpper = preg_match('@[A-Z]@', $password);
        $hasLower = preg_match('@[a-z]@', $password);
        $hasNum   = preg_match('@[0-9]@', $password);

        if (strlen($password) < 8 || !$hasUpper || !$hasLower || !$hasNum) {
            http_response_code(400);
            echo json_encode(["error" => "Password must be at least 8 characters with uppercase, lowercase, and a number."]);
            exit();
        }

        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u OR email = :e");
        $stmt->execute(['u' => $username, 'e' => $email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(["error" => "Username or Email already exists."]);
            exit();
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role) VALUES (:u, :e, :p, 'user')");
        $stmt->execute(['u' => $username, 'e' => $email, 'p' => $hashedPassword]);

        $userId = $pdo->lastInsertId();
        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id' => (int)$userId,
            'username' => $username,
            'email' => $email,
            'role' => 'user'
        ];
        echo json_encode(["data" => $_SESSION['user']]);
        break;

    // ==================== LOGIN ====================
    case 'login':
        $emailOrUsername = trim($input['email'] ?? $input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$emailOrUsername || !$password) {
            http_response_code(400);
            echo json_encode(["error" => "Email/Username and password are required."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :u OR username = :u");
        $stmt->execute(['u' => $emailOrUsername]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid credentials."]);
            exit();
        }

        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'] ?? 'user'
        ];
        echo json_encode(["data" => $_SESSION['user']]);
        break;

    // ==================== LOGOUT ====================
    case 'logout':
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        echo json_encode(["data" => true]);
        break;

    // ==================== CHECK SESSION ====================
    case 'me':
        if (isset($_SESSION['user'])) {
            echo json_encode(["data" => $_SESSION['user']]);
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Unauthenticated"]);
        }
        break;

    // ==================== FORGOT PASSWORD ====================
    case 'forgot-password':
        $email = trim($input['email'] ?? '');

        if (!$email) {
            http_response_code(400);
            echo json_encode(["error" => "Email is required."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = :e");
        $stmt->execute(['e' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Don't reveal if email exists
            echo json_encode(["data" => "If the email exists, a reset link has been sent."]);
            exit();
        }

        // Generate reset token
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $stmt = $pdo->prepare("UPDATE users SET reset_token = :token, reset_expires = :expires WHERE id = :id");
        $stmt->execute(['token' => $token, 'expires' => $expires, 'id' => $user['id']]);

        $resetLink = "http://localhost:5173/reset-password?token=" . $token;

        echo json_encode([
            "data" => "Password reset link generated. Check console for link.",
            "debug_reset_link" => $resetLink
        ]);
        break;

    // ==================== RESET PASSWORD ====================
    case 'reset-password':
        $token = trim($input['token'] ?? '');
        $newPassword = trim($input['password'] ?? '');

        if (!$token || !$newPassword) {
            http_response_code(400);
            echo json_encode(["error" => "Token and new password are required."]);
            exit();
        }

        $hasUpper = preg_match('@[A-Z]@', $newPassword);
        $hasLower = preg_match('@[a-z]@', $newPassword);
        $hasNum   = preg_match('@[0-9]@', $newPassword);

        if (strlen($newPassword) < 8 || !$hasUpper || !$hasLower || !$hasNum) {
            http_response_code(400);
            echo json_encode(["error" => "Password must be at least 8 characters with uppercase, lowercase, and a number."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE reset_token = :token AND reset_expires > NOW()");
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid or expired reset token."]);
            exit();
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password = :p, reset_token = NULL, reset_expires = NULL WHERE id = :id");
        $stmt->execute(['p' => $hashedPassword, 'id' => $user['id']]);

        echo json_encode(["data" => "Password has been reset successfully. You can now login."]);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action: " . htmlspecialchars($action)]);
        break;
}