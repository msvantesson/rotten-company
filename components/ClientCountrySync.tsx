"use client";

import { useEffect } from 'react';

export default function ClientCountrySync() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const country = params.get('country') || params.get('c');
      if (!country) return;

      if (!document.getElementById('rc-country-hide-style')) {
        const style = document.createElement('style');
        style.id = 'rc-country-hide-style';
        style.textContent = '.rc-hidden-by-country { display: none !important; }';
        document.head.appendChild(style);
      }

      const normalize = (s: string) => s.trim().toLowerCase();

      function matches(attrVal: string | null, countryVal: string) {
        if (!attrVal) return false;
        return attrVal
          .split(',')
          .map(normalize)
          .includes(normalize(countryVal));
      }

      function syncToCountry(countryVal: string) {
        const selects = Array.from(
          document.querySelectorAll('select[name="country"], select#country, select[data-country]')
        ) as HTMLSelectElement[];
        selects.forEach((sel) => {
          const found = Array.from(sel.options).find(
            (o) => normalize(o.value) === normalize(countryVal) || normalize(o.text) === normalize(countryVal)
          );
          if (found) {
            sel.value = found.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            const opt = document.createElement('option');
            opt.value = countryVal;
            opt.text = countryVal;
            sel.appendChild(opt);
            sel.value = countryVal;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>('[data-country], [data-country-code], [data-country-name]')
        );
        nodes.forEach((n) => {
          const attr = n.getAttribute('data-country') || n.getAttribute('data-country-code') || n.getAttribute('data-country-name') || '';
          if (matches(attr, countryVal)) {
            n.classList.remove('rc-hidden-by-country');
          } else {
            n.classList.add('rc-hidden-by-country');
          }
        });

        const lis = Array.from(document.querySelectorAll('main ol li, main ul li')) as HTMLElement[];
        lis.forEach((li) => {
          if (li.dataset.country || li.dataset.countryCode || li.dataset.countryName) return;
          const txt = (li.textContent || '').toLowerCase();
          if (txt.includes(normalize(countryVal))) {
            li.classList.remove('rc-hidden-by-country');
          } else {
            // if the li contains a country token like '·' or '· ' or a short label, hide it
            const hasCountryHint = txt.includes('·') || /\b(ir|denmark|den|ireland|dk|ie)\b/.test(txt);
            if (hasCountryHint) li.classList.add('rc-hidden-by-country');
          }
        });
      }

      syncToCountry(country);

      const changeHandler = (e: Event) => {
        const target = e.target as HTMLSelectElement | null;
        if (!target) return;
        const val = target.value;
        syncToCountry(val);
      };

      const watchedSelects = Array.from(
        document.querySelectorAll('select[name="country"], select#country, select[data-country]')
      ) as HTMLSelectElement[];
      watchedSelects.forEach((s) => s.addEventListener('change', changeHandler));
      return () => watchedSelects.forEach((s) => s.removeEventListener('change', changeHandler));
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
