import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { useLanguage } from './LanguageSelector';
import { browserTourStorage, finishTour, shouldOfferTour, tourCopy, tourSteps } from '../lib/event-tour';
import { tourScrollDelta } from '../lib/tour-position';
import './event-tour.css';

type Position = { x: number; y: number; width: number; height: number; cardX: number; cardY: number };
export default function EventTour() {
  const copy = tourCopy[useLanguage()];
  const [step, setStep] = useState<number | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [moving, setMoving] = useState(false);
  const motion = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const id = useId().replace(/:/g, '');
  const active = step !== null;
  const welcome = step === -1;
  const definition = step !== null && step >= 0 ? tourSteps[step] : null;

  useEffect(() => {
    if (shouldOfferTour(browserTourStorage())) setStep(-1);
  }, []);

  function close(outcome: 'completed' | 'skipped') {
    if (motion.current) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    motion.current = false;
    setMoving(false);
    finishTour(outcome, browserTourStorage());
    setStep(null);
    setPosition(null);
  }

  useEffect(() => {
    if (!active) return;
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close('skipped'); return; }
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      (lastFocus.current?.isConnected ? lastFocus.current : trigger.current)?.focus({ preventScroll: true });
    };
  }, [active]);

  useLayoutEffect(() => {
    if (step === null) return;
    const target = definition ? document.querySelector<HTMLElement>(definition.target) : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTarget = () => {
      if (!target) return false;
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? innerWidth, vh = viewport?.height ?? innerHeight;
      const top = viewport?.offsetTop ?? 0, left = viewport?.offsetLeft ?? 0;
      const card = panel.current?.getBoundingClientRect();
      const width = card?.width ?? 350, height = card?.height ?? 260;
      const rect = target.getBoundingClientRect();
      const reserveCard = vw < 700 || (rect.right + width + 16 > left + vw - 16 && rect.left - width - 16 < left + 16);
      const delta = tourScrollDelta(rect, { top: top + 20, bottom: top + vh - (reserveCard ? height + 28 : 20) });
      if (Math.abs(delta) <= 1) return false;
      window.scrollBy({ top: delta, behavior: reducedMotion ? 'instant' : 'smooth' });
      return true;
    };
    const content = panel.current?.querySelector<HTMLElement>('.event-tour-content');
    if (content) content.scrollTop = 0;
    panel.current?.focus({ preventScroll: true });
    let frame = 0;
    let settleFrame = 0;
    const measure = () => {
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? innerWidth, vh = viewport?.height ?? innerHeight;
      const top = viewport?.offsetTop ?? 0, left = viewport?.offsetLeft ?? 0;
      const card = panel.current?.getBoundingClientRect();
      const width = card?.width ?? 340, height = card?.height ?? 260;
      let cardX = left + (vw - width) / 2, cardY = top + (vh - height) / 2;
      const rect = target?.getBoundingClientRect();
      let x = 0, y = 0, w = 0, h = 0;
      if (rect && rect.width && rect.height) {
        const fitsRight = rect.right + 16 + width <= left + vw - 16;
        const fitsLeft = rect.left - 16 - width >= left + 16;
        if (vw < 700 || (!fitsRight && !fitsLeft)) { cardX = vw < 700 ? left + 12 : left + (vw - width) / 2; cardY = top + vh - height - 12; }
        else {
          cardX = fitsRight ? rect.right + 16 : rect.left - 16 - width;
          cardY = Math.max(top + 16, Math.min(top + vh - height - 16, rect.top));
        }
        x = Math.max(left + 8, rect.left - 6); y = Math.max(top + 8, rect.top - 6);
        const bottom = vw < 700 || (!fitsRight && !fitsLeft) ? Math.min(rect.bottom + 6, cardY - 12) : Math.min(rect.bottom + 6, top + vh - 8);
        w = Math.max(0, Math.min(rect.right + 6, left + vw - 8) - x); h = Math.max(0, bottom - y);
      }
      const next = { x, y, width: w, height: h, cardX, cardY };
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const reveal = () => {
      cancelAnimationFrame(settleFrame);
      motion.current = true;
      setMoving(true);
      const scrolled = revealTarget();
      measure();
      if (reducedMotion) { motion.current = false; setMoving(false); return; }
      const started = performance.now();
      let previousY = window.scrollY, stableFrames = 0;
      const settle = (time: number) => {
        stableFrames = Math.abs(window.scrollY - previousY) < .5 ? stableFrames + 1 : 0;
        previousY = window.scrollY;
        if ((!scrolled && time - started >= 150) || (time - started >= 150 && stableFrames >= 4) || time - started >= 1400) {
          measure(); motion.current = false; setMoving(false);
        } else settleFrame = requestAnimationFrame(settle);
      };
      settleFrame = requestAnimationFrame(settle);
    };
    reveal();
    const observer = new ResizeObserver(schedule);
    if (panel.current) observer.observe(panel.current);
    if (target) observer.observe(target);
    window.addEventListener('resize', reveal);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', reveal);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(settleFrame); observer.disconnect();
      if (motion.current) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      motion.current = false;
      window.removeEventListener('resize', reveal); window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', reveal); window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [step, definition, copy]);

  const content = definition ? copy[definition.key] : null;
  return <>
    <button ref={trigger} type="button" className="button secondary compact event-tour-trigger" onClick={() => setStep(-1)}><CircleHelp size={16} aria-hidden="true"/>{copy.guide}</button>
    {active && createPortal(<div className="event-tour-layer" data-moving={moving}>
      <svg className="event-tour-shade" aria-hidden="true" width="100%" height="100%">
        <defs><mask id={id}><rect width="100%" height="100%" fill="white"/>{position && <rect className="event-tour-cutout" x={position.x} y={position.y} width={position.width} height={position.height} rx="12" fill="black"/>}</mask></defs>
        <rect width="100%" height="100%" fill="#102e28" fillOpacity=".20" mask={`url(#${id})`}/>
        {position && position.height > 0 && <rect className="event-tour-ring" x={position.x} y={position.y} width={position.width} height={position.height} rx="12" fill="none" stroke="#238d80" strokeWidth="2"/>}
      </svg>
      <div ref={panel} className="event-tour-panel" data-welcome={welcome} role="dialog" aria-modal="true" aria-busy={moving} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} tabIndex={-1} style={position ? { left: position.cardX, top: position.cardY } : undefined}>
        <div className="event-tour-content">
        {!welcome && <p className="event-tour-progress">{copy.progress.replace('{step}', String((step ?? 0) + 1)).replace('{total}', String(tourSteps.length))}</p>}
        <h2 id={`${id}-title`}>{welcome ? copy.welcome : content?.[0]}</h2>
        <p id={`${id}-body`}>{welcome ? copy.intro : content?.[1]}</p>
        {!welcome && position?.height === 0 && <p className="event-tour-unavailable">{copy.unavailable}</p>}
        </div>
        <div className="event-tour-actions">
          <button type="button" className="text-button event-tour-skip" onClick={() => close('skipped')}>{copy.skip}</button>
          <div>{!welcome && <button type="button" className="button secondary compact" onClick={() => setStep(value => (value ?? 0) - 1)}>{copy.back}</button>}
            <button type="button" className="button primary compact" onClick={() => step === tourSteps.length - 1 ? close('completed') : setStep(value => (value ?? -1) + 1)}>{welcome ? copy.start : step === tourSteps.length - 1 ? copy.done : copy.next}</button>
          </div>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
