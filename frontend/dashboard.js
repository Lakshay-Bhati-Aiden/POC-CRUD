const rowsEl = document.getElementById("rows");
const message = document.getElementById("message");

const LIMIT = 5;
let offset = 0;
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");

async function loadApplications() {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/applications?limit=${LIMIT}&offset=${offset}`
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = `Error ${response.status}`;
      return;
    }
    message.textContent = `${data.total} application(s)`;
    rowsEl.textContent = "";
    for (const app of data.items) {
      const tr = document.createElement("tr");
      for (const value of [app.id, app.name, app.email, app.plan ?? "-"]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      }
      const statusTd = document.createElement("td");
      const badge = document.createElement("span");
      badge.textContent = app.status;
      badge.className = `badge badge-${app.status}`;
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);
      
      const actionTd = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", () => deleteApplication(app.id));
      actionTd.appendChild(deleteBtn);
      tr.appendChild(actionTd);
      rowsEl.appendChild(tr);
    }
    const page = offset / LIMIT + 1;
    const pages = Math.max(1, Math.ceil(data.total / LIMIT));
    pageInfo.textContent = `Page ${page} of ${pages}`;
    prevBtn.disabled = offset === 0;
    nextBtn.disabled = offset + LIMIT >= data.total;
  } catch (error) {
    console.error(error);
    message.textContent = "Couldn't load applications.";
  }
}

async function deleteApplication(id) {
  if (!confirm(`Delete application #${id}? This cannot be undone.`)) return;
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/applications/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      loadApplications();
    } else {
      const data = await response.json();
      message.textContent = `Error ${response.status}: ${data.detail}`;
    }
  } catch (error) {
    console.error(error);
    message.textContent = "Couldn't delete right now. Please try again.";
  }
}

prevBtn.addEventListener("click", () => {
  offset -= LIMIT;
  loadApplications();
});

nextBtn.addEventListener("click", () => {
  offset += LIMIT;
  loadApplications();
});

loadApplications();