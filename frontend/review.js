const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const details = document.getElementById("details");

async function loadApplication() {
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/applications/${id}`);
    const data = await response.json();
    if (!response.ok) {
      details.textContent = `Error ${response.status}: ${data.detail}`;
      return;
    }
    details.textContent =
      `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n` +
      `Plan: ${data.plan}\nNewsletter: ${data.newsletter ? "Yes" : "No"}\nStatus: ${data.status}`;
  } catch (error) {
    console.error(error);
    details.textContent = "Couldn't load your application. Please try again in a moment.";
  }
}

const result = document.getElementById("result");

document.getElementById("submit-btn").addEventListener("click", async () => {
  try {
  const response = await fetch(`http://127.0.0.1:8000/api/applications/${id}/submit`, {
    method: "POST",
  });
  const data = await response.json();
  if (response.ok) {
    result.textContent = "Application submitted.";
    loadApplication();
  } else {
    result.textContent = `Error ${response.status}: ${data.detail}`;
  } 
  }catch (error) {
    console.error(error);
    details.textContent = "Couldn't load your application. Please try again in a moment.";
  }
});

// document.getElementById("dashboard-btn").addEventListener("click", () => {
//   window.location.href = `dashboard.html`;
// });

loadApplication();