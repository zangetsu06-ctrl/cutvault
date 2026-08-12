<?php
// 1. Prevent PHP HTML error traces from corrupting React JSON responses
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 2. File upload limits
ini_set('upload_max_filesize', '4096M');
ini_set('post_max_size', '4096M');
ini_set('max_execution_time', '600');
ini_set('max_input_time', '600');
ini_set('memory_limit', '512M');

ini_set('session.cookie_samesite', 'Lax');

// 2. Set API headers
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

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized session."]);
    exit();
}

$userId = $_SESSION['user']['id'];
$action = strtolower($_GET['action'] ?? $_POST['action'] ?? '');
if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = 'list';
}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

try {
    switch ($action) {
        case 'list':
            $search = trim($_GET['search'] ?? '');
            $category = trim($_GET['category'] ?? '');

            $sql = "SELECT id, 
                           original_name AS title, 
                           original_name, 
                           stored_name, 
                           file_size AS fileSize, 
                           file_size, 
                           duration, 
                           mime_type, 
                           category, 
                           uploaded_at 
                    FROM assets WHERE 1=1";

            $params = [];

            if (!empty($search)) {
                $sql .= " AND (original_name LIKE :search OR title LIKE :search2)";
                $params['search'] = '%' . $search . '%';
                $params['search2'] = '%' . $search . '%';
            }

            if (!empty($category) && $category !== 'All Assets') {
                $sql .= " AND LOWER(TRIM(category)) = LOWER(TRIM(:cat))";
                $params['cat'] = $category;
            }

            $sql .= " ORDER BY uploaded_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($assets);
            break;

        case 'create':
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true) ?: $_POST;

            $title = trim($input['title'] ?? $input['original_name'] ?? '');
            $category = trim($input['category'] ?? 'Other');
            $duration = (int)($input['duration'] ?? 0);
            
            // Converts MB input from UI into Bytes for storage
            $fileSizeMB = (float)($input['fileSize'] ?? $input['file_size'] ?? 0);
            $fileSizeBytes = (int)($fileSizeMB * 1024 * 1024);

            if (empty($title)) {
                http_response_code(400);
                echo json_encode(["error" => "Title is required."]);
                exit();
            }

            $stmt = $pdo->prepare("
                INSERT INTO assets (user_id, original_name, stored_name, file_size, duration, mime_type, category) 
                VALUES (:u, :o, '', :sz, :d, 'application/octet-stream', :c)
            ");
            $stmt->execute([
                'u'  => $userId,
                'o'  => $title,
                'sz' => $fileSizeBytes,
                'd'  => $duration,
                'c'  => $category
            ]);

            $newId = (int)$pdo->lastInsertId();
            echo json_encode([
                "data" => [
                    "id" => $newId,
                    "title" => $title,
                    "original_name" => $title,
                    "category" => $category,
                    "duration" => $duration,
                    "fileSize" => $fileSizeBytes,
                    "file_size" => $fileSizeBytes,
                    "mime_type" => "application/octet-stream"
                ]
            ]);
            break;

        case 'update':
            $assetId = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true) ?: $_POST;

            $title = trim($input['title'] ?? $input['original_name'] ?? '');
            $category = trim($input['category'] ?? '');
            $duration = isset($input['duration']) ? (int)$input['duration'] : null;
            $fileSizeMB = isset($input['fileSize']) ? (float)$input['fileSize'] : (isset($input['file_size']) ? (float)$input['file_size'] : null);

            if (!$assetId) {
                http_response_code(400);
                echo json_encode(["error" => "Asset ID is required for update."]);
                exit();
            }

            $stmt = $pdo->prepare("
                UPDATE assets 
                SET original_name = CASE WHEN :o1 != '' THEN :o2 ELSE original_name END, 
                    category = CASE WHEN :c1 != '' THEN :c2 ELSE category END,
                    duration = COALESCE(:d, duration),
                    file_size = CASE WHEN :sz IS NOT NULL THEN :sz2 ELSE file_size END
                WHERE id = :id AND user_id = :u
            ");
            $stmt->execute([
                'o1'  => $title,
                'o2'  => $title,
                'c1'  => $category,
                'c2'  => $category,
                'd'   => $duration,
                'sz'  => $fileSizeMB,
                'sz2' => $fileSizeMB !== null ? (int)($fileSizeMB * 1024 * 1024) : 0,
                'id'  => $assetId,
                'u'   => $userId
            ]);

            $stmt = $pdo->prepare("SELECT id, original_name AS title, original_name, stored_name, file_size AS fileSize, file_size, duration, mime_type, category, uploaded_at FROM assets WHERE id = :id AND user_id = :u");
            $stmt->execute(['id' => $assetId, 'u' => $userId]);
            $updatedAsset = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(["data" => $updatedAsset]);
            break;

        case 'upload':
            if (empty($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(["error" => "No file uploaded."]);
                exit();
            }

            $file = $_FILES['file'];
            $category = trim($_POST['category'] ?? 'Other');

            if ($file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(["error" => "Upload failed with error code: " . $file['error']]);
                exit();
            }

            $originalName = basename($file['name']);
            $title = trim($_POST['title'] ?? pathinfo($originalName, PATHINFO_FILENAME));
            $duration = (int)($_POST['duration'] ?? 0);
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav'];

            if (!in_array($ext, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(["error" => "Unsupported file type."]);
                exit();
            }

            $storedName = bin2hex(random_bytes(16)) . '.' . $ext;
            $targetPath = $uploadDir . $storedName;

            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                http_response_code(500);
                echo json_encode(["error" => "Failed to save file on server."]);
                exit();
            }

            $mimeType = mime_content_type($targetPath) ?: 'application/octet-stream';

            $stmt = $pdo->prepare("INSERT INTO assets (user_id, original_name, stored_name, file_size, duration, mime_type, category) VALUES (:u, :o, :s, :sz, :d, :m, :c)");
            $stmt->execute([
                'u'  => $userId,
                'o'  => $title,
                's'  => $storedName,
                'sz' => $file['size'],
                'd'  => $duration,
                'm'  => $mimeType,
                'c'  => $category
            ]);

            $newId = (int)$pdo->lastInsertId();
            echo json_encode([
                "data" => [
                    "id" => $newId,
                    "title" => $title,
                    "original_name" => $title,
                    "category" => $category,
                    "duration" => $duration,
                    "fileSize" => $file['size'],
                    "file_size" => $file['size'],
                    "mime_type" => $mimeType
                ]
            ]);
            break;

        case 'download':
            $assetId = (int)($_GET['id'] ?? 0);

            $stmt = $pdo->prepare("SELECT * FROM assets WHERE id = :id");
            $stmt->execute(['id' => $assetId]);
            $asset = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$asset || !file_exists($uploadDir . $asset['stored_name'])) {
                http_response_code(404);
                echo json_encode(["error" => "File not found."]);
                exit();
            }

            $filePath = $uploadDir . $asset['stored_name'];

            header('Content-Description: File Transfer');
            header('Content-Type: ' . $asset['mime_type']);
            header('Content-Disposition: attachment; filename="' . addslashes($asset['original_name']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($filePath));

            readfile($filePath);
            exit();

        case 'delete':
            $assetId = (int)($_GET['id'] ?? 0);

            $stmt = $pdo->prepare("SELECT stored_name FROM assets WHERE id = :id");
            $stmt->execute(['id' => $assetId]);
            $asset = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($asset) {
                $filePath = $uploadDir . $asset['stored_name'];
                if (!empty($asset['stored_name']) && file_exists($filePath)) {
                    unlink($filePath);
                }
                $delStmt = $pdo->prepare("DELETE FROM assets WHERE id = :id");
                $delStmt->execute(['id' => $assetId]);
            }

            echo json_encode(["data" => true]);
            break;

        default:
            http_response_code(400);
            echo json_encode(["error" => "Invalid asset action."]);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    exit();
}