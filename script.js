const questions = document.querySelectorAll(".question")
const chaquePlus = document.querySelectorAll(".plus")
const chaqueMoins = document.querySelectorAll(".moins")
let reponses = document.querySelectorAll(".answer")




questions.forEach((question, index) => {
    question.addEventListener("click", () => {
        const reponse = reponses[index];
        
        if (reponse.style.display === "block") {
            reponse.style.display = "none";
        } else {
            reponse.style.display = "block";
        }


        const moins = chaqueMoins[index];
        
        if (moins.style.display === "block") {
            moins.style.display = "none";
        } else {
            moins.style.display = "block";
        }

        const plus = chaquePlus[index];
        
        if (plus.style.display === "block") {
            plus.style.display = "none";
        } else {
            plus.style.display = "block";
        }

    })
})


/* =========================
   Prise de rendez-vous
   ========================= */

// Endpoint PHP hébergé sur OVH (domaine technique), site statique sur GitHub Pages
const ENDPOINT_RDV = "https://mobiley.cluster129.hosting.ovh.net/rdv.php";

// Liste des interventions. price = null => "sur devis" (non compté dans l'estimation)
const INTERVENTIONS_RDV = [
    { id: "diag",         label: "Diagnostic électronique",         price: 35  },
    { id: "vidange",      label: "Vidange",                         price: 120 },
    { id: "distribution", label: "Forfait Kit distribution",        price: 380 },
    { id: "freins",       label: "Freinage (plaquettes / disques)", price: null },
    { id: "embrayage",    label: "Embrayage",                       price: null },
    { id: "fap",          label: "Régénération FAP",                price: null },
    { id: "revision",     label: "Révision constructeur",           price: null },
    { id: "autre",        label: "Autre intervention",              price: null },
];

const rdvForm = document.getElementById("rdv-form");

if (rdvForm) {
    const container = document.getElementById("rdv-interventions");
    const estimateEl = document.getElementById("rdv-estimate-value");
    const dateInput = document.getElementById("rdv-date");
    const feedback = document.getElementById("rdv-feedback");
    const submitBtn = rdvForm.querySelector(".rdv-submit");

    // 1. Génération des interventions
    INTERVENTIONS_RDV.forEach((item) => {
        const priceTxt = item.price != null ? `à partir de ${item.price} €` : "sur devis";
        const label = document.createElement("label");
        label.className = "rdv-item";
        label.innerHTML =
            `<input type="checkbox" value="${item.id}" data-price="${item.price ?? ""}" data-label="${item.label}">` +
            `<span class="rdv-item-name">${item.label}</span>` +
            `<span class="rdv-item-price">${priceTxt}</span>`;
        container.appendChild(label);
    });

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    // Recalcul de l'estimation
    function updateEstimate() {
        let total = 0, hasDevis = false, anySelected = false;
        checkboxes.forEach((cb) => {
            if (cb.checked) {
                anySelected = true;
                if (cb.dataset.price === "") hasDevis = true;
                else total += Number(cb.dataset.price);
            }
        });
        if (!anySelected) { estimateEl.textContent = "—"; return; }
        let txt = total > 0 ? `à partir de ${total} € TTC` : "sur devis";
        if (hasDevis && total > 0) txt += " + devis";
        estimateEl.textContent = txt;
    }
    checkboxes.forEach((cb) => cb.addEventListener("change", updateEstimate));

    // 2. Date : minimum = demain, blocage week-end (lun–ven)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split("T")[0];

    dateInput.addEventListener("input", () => {
        const day = new Date(dateInput.value + "T00:00:00").getDay();
        if (day === 0 || day === 6) {
            dateInput.setCustomValidity("Interventions du lundi au vendredi uniquement.");
        } else {
            dateInput.setCustomValidity("");
        }
    });

    // 3. Envoi
    rdvForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const selected = [...checkboxes].filter((cb) => cb.checked);
        if (selected.length === 0) {
            feedback.textContent = "Veuillez sélectionner au moins une intervention.";
            feedback.className = "rdv-feedback error";
            return;
        }
        if (!rdvForm.reportValidity()) return;

        const payload = {
            name: document.getElementById("rdv-name").value.trim(),
            phone: document.getElementById("rdv-phone").value.trim(),
            date: dateInput.value,
            slot: rdvForm.slot.value,
            interventions: selected.map((cb) => cb.dataset.label),
            estimate: estimateEl.textContent,
            _gotcha: rdvForm._gotcha ? rdvForm._gotcha.value : "",
        };

        submitBtn.disabled = true;
        feedback.textContent = "Envoi en cours…";
        feedback.className = "rdv-feedback";

        try {
            const res = await fetch(ENDPOINT_RDV, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
                feedback.textContent = "Demande envoyée ! Je vous rappelle rapidement pour confirmer le rendez-vous.";
                feedback.className = "rdv-feedback success";
                rdvForm.reset();
                updateEstimate();
            } else {
                feedback.textContent = data.error
                    ? "Erreur : " + data.error
                    : "Une erreur est survenue. Réessayez ou contactez-moi via le formulaire ci-dessous.";
                feedback.className = "rdv-feedback error";
            }
        } catch (err) {
            feedback.textContent = "Connexion impossible. Réessayez ou contactez-moi via le formulaire ci-dessous.";
            feedback.className = "rdv-feedback error";
        } finally {
            submitBtn.disabled = false;
        }
    });
}