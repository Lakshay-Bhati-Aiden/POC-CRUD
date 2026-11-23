const form = document.getElementById("page1-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
  };
  const response = await fetch("http://127.0.0.1:8000/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
    if (response.ok) {
    window.location.href = `page2.html?id=${data.id}`;
  } else {
    result.textContent = `Status ${response.status}: ${JSON.stringify(data)}`;
  }
});
