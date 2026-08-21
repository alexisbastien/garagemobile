/**
 * Garage Mobile — Réception des rendez-vous et création d'un événement
 * dans Google Agenda.
 *
 * DÉPLOIEMENT (une seule fois) :
 *  1. https://script.google.com  ->  Nouveau projet
 *  2. Colle ce code, remplis la config ci-dessous.
 *  3. Déployer  ->  Nouveau déploiement  ->  type "Application Web"
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *  4. Autorise l'accès (Agenda + Gmail) quand c'est demandé.
 *  5. Copie l'URL qui se termine par /exec et colle-la dans
 *     script.js -> const ENDPOINT_RDV.
 */

// ===== Config =====
const CALENDAR_ID = "primary";          // "primary" = ton agenda principal,
                                        // ou l'ID d'un agenda dédié "Garage".
const OWNER_EMAIL = "assistance.mobilegarage@gmail.com"; // notification e-mail ("" pour désactiver)

const SLOTS = {
  matin:     { start: 10, end: 13, label: "Matin (10h–13h)" },
  apresmidi: { start: 14, end: 16, label: "Après-midi (14h–16h)" },
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const slot = SLOTS[data.slot];
    if (!slot) throw new Error("Créneau invalide");
    if (!data.date) throw new Error("Date manquante");

    const [y, m, d] = data.date.split("-").map(Number);
    const start = new Date(y, m - 1, d, slot.start, 0, 0);
    const end   = new Date(y, m - 1, d, slot.end,   0, 0);

    const cal = CALENDAR_ID === "primary"
      ? CalendarApp.getDefaultCalendar()
      : CalendarApp.getCalendarById(CALENDAR_ID);

    const title = "RDV Garage — " + (data.name || "Client");
    const description =
      "Client : " + (data.name || "") + "\n" +
      "Téléphone : " + (data.phone || "") + "\n" +
      "Créneau : " + slot.label + "\n" +
      "Interventions : " + (data.interventions || []).join(", ") + "\n" +
      "Estimation : " + (data.estimate || "") + "\n" +
      "(Estimation indicative, non contractuelle)";

    cal.createEvent(title, start, end, { description: description });

    if (OWNER_EMAIL) {
      MailApp.sendEmail({
        to: OWNER_EMAIL,
        subject: "Nouveau RDV — " + data.name + " (" + data.date + ", " + slot.label + ")",
        body: description,
      });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
