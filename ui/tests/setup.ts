// Vitest jsdom setup: mock Canvas 2D context so components using <canvas> render without errors.

const noop = () => {};

class CanvasGradientMock {}
class CanvasPatternMock {}

const context2DMock: Partial<CanvasRenderingContext2D> = {
  // state
  canvas: undefined as any,
  save: noop,
  restore: noop,
  // transformations
  scale: noop,
  rotate: noop,
  translate: noop,
  setTransform: noop as any,
  resetTransform: noop as any,
  // compositing
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  // colors and styles
  strokeStyle: '#000',
  fillStyle: '#000',
  createLinearGradient: (() => new CanvasGradientMock()) as any,
  createRadialGradient: (() => new CanvasGradientMock()) as any,
  createPattern: (() => new CanvasPatternMock()) as any,
  // shadows
  shadowBlur: 0,
  shadowColor: 'transparent',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  // rects
  clearRect: noop,
  fillRect: noop,
  strokeRect: noop,
  // path API
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  bezierCurveTo: noop,
  quadraticCurveTo: noop,
  arc: noop as any,
  arcTo: noop as any,
  ellipse: noop as any,
  rect: noop,
  fill: noop as any,
  stroke: noop,
  clip: noop as any,
  // draw text
  font: '10px sans-serif',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  direction: 'inherit',
  fillText: noop,
  strokeText: noop,
  measureText: (() => ({ width: 10 })) as any,
  // line styles
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  getLineDash: (() => []) as any,
  setLineDash: noop as any,
  lineDashOffset: 0,
  // images
  drawImage: noop as any,
  // pixel manipulation
  createImageData: (() => ({})) as any,
  getImageData: (() => ({})) as any,
  putImageData: noop as any,
  // hit regions (ignored)
  isPointInPath: (() => false) as any,
  isPointInStroke: (() => false) as any,
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext(type: string) {
    if (type === '2d') {
      // attach canvas reference for any consumers
      (context2DMock as any).canvas = this;
      return context2DMock as CanvasRenderingContext2D;
    }
    return null;
  },
});

