"use client";

import { useEffect } from "react";

export default function ClientCountrySync() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const country = (params.get("country") || params.get("c") || "").trim();
      if (!country) return;

      const countryLower = country.toLowerCase();

      // inject hiding style if not present
      if (!document.getElementById("rc-country-hide-style")) {
        const style = document.createElement("style");
        style.id = "rc-country-hide-style";
        style.textContent = ".rc-hidden-by-country { display: none !important; }";
        document.head.appendChild(style);
      }

      const elementMatchesCountry = (el: HTMLElement, targetLower: string) => {
        const txt = (el.textContent || "").toLowerCase();
        if (txt.includes(targetLower)) return true;
        const data = (el.getAttribute("data-country") || "").toLowerCase();
        if (data && data.includes(targetLower)) return true;
        return false;
      };

      // 1) sync selects to the URL param
      const selects = Array.from(document.querySelectorAll('select[name="country"], select#country')) as HTMLSelectElement[];
      selects.forEach((sel) => {
        const found = Array.from(sel.options).find(
          (o) => o.value.trim().toLowerCase() === countryLower || o.text.trim().toLowerCase().includes(countryLower)
        );
        if (found) {
          sel.value = found.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          const opt = document.createElement("option");
          opt.value = country;
          opt.text = country;
          sel.appendChild(opt);
          sel.value = country;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      // 2) hide list items that do NOT match the country text or data attribute
      const updateVisibility = (targetCountryLower = countryLower) => {
        const listItems = Array.from(document.querySelectorAll("main ol li, main ul li")) as HTMLElement[];
        listItems.forEach((li) => {
          const keep = elementMatchesCountry(li, targetCountryLower);
          if (keep) {
            li.classList.remove("rc-hidden-by-country");
            li.removeAttribute("aria-hidden");
          } else {
            li.classList.add("rc-hidden-by-country");
            li.setAttribute("aria-hidden", "true");
          }
        });
      };

      updateVisibility(countryLower);

      // 3) keep in sync if user changes the select(s)
      const changeHandler = (e: Event) => {
        const target = e.target as HTMLSelectElement | null;
        if (!target) return;
        const val = (target.value || "").toLowerCase();
        updateVisibility(val);
      };
      selects.forEach((s) => s.addEventListener("change", changeHandler));

      // 4) observe DOM changes so dynamic content is handled
      const mo = new MutationObserver(() => updateVisibility(countryLower));
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });

      return () => {
        selects.forEach((s) => s.removeEventListener("change", changeHandler));
        mo.disconnect();
      };
    } catch (err) {
      // swallow errors
    }
  }, []);

  return null;
}
