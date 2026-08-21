<?php
/**
 * rdv.php — Réception des demandes de rendez-vous (Garage Mobile)
 * À placer à la racine de l'hébergement OVH, à côté de index.html.
 * Même domaine que le formulaire => aucun problème de CORS.
 */

header('Content-Type: application/json; charset=utf-8');

// ===== Config =====
$OWNER_EMAIL     = 'assistance.mobilegarage@gmail.com';   // adresse qui reçoit les demandes
$FROM_EMAIL      = 'site@mobilegarage.fr';       // expéditeur (mailbox du domaine OVH)
$APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec'; // Google Agenda — '' pour désactiver

$SLOTS = array(
    'matin'     => 'Matin (10h-13h)',
    'apresmidi' => 'Apres-midi (14h-16h)',
);

// ===== Méthode =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'error' => 'Methode non autorisee'));
    exit;
}

// ===== Lecture du corps JSON =====
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'error' => 'Requete invalide'));
    exit;
}

// ===== Anti-spam (honeypot) =====
if (!empty($data['_gotcha'])) {
    echo json_encode(array('ok' => true)); // on ignore silencieusement
    exit;
}

// ===== Validation =====
$name   = trim(isset($data['name'])     ? $data['name']     : '');
$phone  = trim(isset($data['phone'])    ? $data['phone']    : '');
$date   = trim(isset($data['date'])     ? $data['date']     : '');
$slot   = isset($data['slot'])          ? $data['slot']     : '';
$interv = isset($data['interventions']) ? $data['interventions'] : array();
$est    = trim(isset($data['estimate']) ? $data['estimate'] : '');

$errors = array();
if ($name === '')                                              $errors[] = 'nom';
if (!preg_match('/[0-9]{6,}/', preg_replace('/\s+/', '', $phone))) $errors[] = 'telephone';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))               $errors[] = 'date';
if (!isset($SLOTS[$slot]))                                     $errors[] = 'creneau';
if (!is_array($interv) || count($interv) === 0)               $errors[] = 'interventions';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(array('ok' => false, 'error' => 'Champs invalides : ' . implode(', ', $errors)));
    exit;
}

$slotLabel = $SLOTS[$slot];
$intervStr = implode(', ', array_map('strval', $interv));

// ===== 1) E-mail au garage =====
$subject = "Nouveau RDV - $name ($date, $slotLabel)";
$body =
    "Client : $name\n" .
    "Telephone : $phone\n" .
    "Date : $date\n" .
    "Creneau : $slotLabel\n" .
    "Interventions : $intervStr\n" .
    "Estimation : $est\n" .
    "(Estimation indicative, non contractuelle)";

$headers  = "From: $FROM_EMAIL\r\n";
$headers .= "Content-Type: text/plain; charset=utf-8\r\n";
@mail($OWNER_EMAIL, $subject, $body, $headers);

// ===== 2) Ajout dans Google Agenda (via Apps Script) =====
$calendarOk = true;
if ($APPS_SCRIPT_URL !== '') {
    $ch = curl_init($APPS_SCRIPT_URL);
    curl_setopt_array($ch, array(
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(array(
            'name'          => $name,
            'phone'         => $phone,
            'date'          => $date,
            'slot'          => $slot,
            'interventions' => array_values($interv),
            'estimate'      => $est,
        )),
        CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,   // Apps Script redirige vers googleusercontent
        CURLOPT_TIMEOUT        => 15,
    ));
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($resp, true);
    $calendarOk = ($code >= 200 && $code < 300)
        && (!is_array($decoded) || !isset($decoded['ok']) || $decoded['ok'] === true);
}

// On confirme au visiteur tant que la demande est reçue : l'e-mail garantit le suivi
// même si l'agenda renvoie une erreur (le champ "calendar" permet de le tracer).
echo json_encode(array('ok' => true, 'calendar' => $calendarOk));
