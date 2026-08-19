"use client";

import { useState, type ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="zad-accordion">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="zad-accordion__item">
            <button
              type="button"
              className="zad-accordion__trigger"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span>{item.title}</span>
              <span aria-hidden>{open ? "−" : "+"}</span>
            </button>
            {open && <div className="zad-accordion__panel">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
