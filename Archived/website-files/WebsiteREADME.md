
# 🌐 **Website Structure for QRS\@NTU**

### **1. Home (Landing Page)**

* **Hero section**:

  * Club name + tagline (“Advancing Quantitative Research at NTU”).
  * Brief one-liner about vision.
  * Call-to-action buttons: *Join Us*, *Explore Research*, *View Publications*.
* **Featured project spotlight** (e.g. *ntuinfo.com* or CFA award project).
* Quick links to: Research | Notes | Events | Publications | Contact.

---

### **2. About**

* Vision & Mission.
* Focus areas: Academic Research, Specialised Learning, Knowledge Sharing, Outreach.
* Membership structure (Core Researchers, Associates, Advisors).
* Advisory Board / Mentors (if any).

---

### **3. Research**

* **Ongoing projects** (short abstracts, GitHub links).
* **Past projects** (archives).
* **Flagship works** (*ntuinfo.com*, CFA competition finalist).

---

### **4. Math Notes 📘** (separate page)

* **Organized by course code** (e.g. MH1200 Linear Algebra, MH3200 Convex Optimisation, etc.).
* Each note: title, short description, download/view link (PDF/HTML).
* Optionally searchable/filterable by topic (Algebra, Probability, Optimisation).
* Collaborative notes system (contributions from members).

---

### **5. Publications**

* Research papers and reports authored by QRS.
* Open-source toolkits and algorithms.
* Whitepapers and technical writeups.

---

### **6. Events & Learning**

* Advanced workshops and mini-courses.
* Seminars / Reading groups.
* Event calendar.

---

### **7. Awards & Recognition**

* Competitions (e.g. CFA China Finalist).
* Research prizes and achievements.
* Showcase of member successes.

---

### **8. Join Us**

* Application process.
* Eligibility and expectations.
* Application form / email link.

---

### **9. Contact**

* 📧 Email: [job@yuhesui.com](mailto:job@yuhesui.com)
* 🌐 Links: GitHub | LinkedIn | NTU societies portal.
* Newsletter / mailing list signup.

---

### **10. (Optional) Internal Resources**

* Member-only area for project docs, collaboration, and internal notes.

---

💡 **Implementation idea for the Math Notes page**:

* **Static site generator (Next.js / Hugo)** → render notes from Markdown in a structured folder (`/notes/MH1200.md`, etc.).
* Auto-generate index by course code.
* Add **search/filter bar** for quick topic lookup.
