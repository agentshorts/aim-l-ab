export function card(html: string) { const d = document.createElement("div"); d.className = "card"; d.innerHTML = html; document.body.appendChild(d); return d; }
