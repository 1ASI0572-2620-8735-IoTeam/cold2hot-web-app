import { Directive, ElementRef, OnInit, inject, input } from '@angular/core';
import { animate } from 'motion/mini';

/**
 * Entrada animada con Motion (la librería de Framer Motion para JS/DOM, usable en Angular).
 * `appReveal` acepta el índice del elemento para escalonar (stagger). Respeta prefers-reduced-motion.
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements OnInit {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Índice dentro de la lista, usado para el retraso escalonado. */
  readonly appReveal = input<number | '' | undefined>(0);

  ngOnInit() {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const index = Number(this.appReveal() || 0);
    animate(
      this.el.nativeElement,
      { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] },
      { duration: 0.45, delay: Math.min(index, 12) * 0.05, ease: [0.22, 1, 0.36, 1] }
    );
  }
}
