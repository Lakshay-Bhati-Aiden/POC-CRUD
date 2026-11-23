const params = new URLSearchParams(window.location.search);
const id = params.get("id");

document.getElementById("info").textContent = `Editing application #${id}`;

const form = document.getElementById("page2-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    plan: document.getElementById("plan").value,
    newsletter: document.getElementById("newsletter").checked,
  };
  try {
  const response = await fetch(`http://127.0.0.1:8000/api/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
    if (response.ok) {
    window.location.href = `review.html?id=${id}`;
  } else {
    result.textContent = `Status ${response.status}: ${JSON.stringify(data)}`;
  }
  } catch (error) {
    console.error(error);
    result.textContent = "Couldn't reach the server. Please try again in a moment.";
  }
});