import { useState, useRef } from "react";
import styles from "./RoomCarousel.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RoomCarousel({ images = [], height = 180, onLightbox }) {
  const [idx, setIdx]     = useState(0);
  const touchStart        = useRef(null);

  const imgs = images.filter(Boolean);
  if (!imgs.length) return (
    <div className={styles.placeholder} style={{ height }}>
      <span>🏠</span>
      <p>No photos yet</p>
    </div>
  );

  const prev = (e) => { e?.stopPropagation(); setIdx((i) => (i - 1 + imgs.length) % imgs.length); };
  const next = (e) => { e?.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); };

  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  }

  const src = `${API_URL}/uploads/${imgs[idx]}`;

  return (
    <div className={styles.wrap} style={{ height }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      <img
        src={src}
        alt={`Photo ${idx + 1}`}
        className={styles.img}
        onClick={() => onLightbox?.(src)}
        style={{ cursor: onLightbox ? "zoom-in" : "default" }}
      />

      {imgs.length > 1 && (
        <>
          <button className={`${styles.arrow} ${styles.left}`}  onClick={prev}>‹</button>
          <button className={`${styles.arrow} ${styles.right}`} onClick={next}>›</button>
          <div className={styles.dots}>
            {imgs.map((_, i) => (
              <button key={i} className={`${styles.dot} ${i === idx ? styles.dotActive : ""}`}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }} />
            ))}
          </div>
          <div className={styles.counter}>{idx + 1} / {imgs.length}</div>
        </>
      )}
    </div>
  );
}
