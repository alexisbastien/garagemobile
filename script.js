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