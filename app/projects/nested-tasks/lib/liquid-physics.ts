/**
 * Viscous Gel liquid physics for checkbox fill animation.
 * Extracted from liquid-test.html prototype.
 *
 * Simulates a thick, gooey fluid surface using spring-connected points
 * with right-side impact for fill and left-side disturbance for drain.
 */

export interface LiquidConfig {
  numPoints: number;
  stiffness: number;
  spread: number;
  force: number;
  damping: number;
}

const DEFAULT_CONFIG: LiquidConfig = {
  numPoints: 40,
  stiffness: 0.008,
  spread: 0.08,
  force: 0.6,
  damping: 0.975,
};

export class ViscousBlob {
  /** Current rendered fill (eases toward target). */
  fill: number = 0;
  /** Target fill level (0–1). */
  targetFill: number = 0;

  private numPoints: number;
  private heights: Float32Array;
  private velocities: Float32Array;
  private stiffness: number;
  private spread: number;
  private force: number;
  private damping: number;

  /** Bulge oscillation state. */
  private bulge: number = 0;
  private bulgeVel: number = 0;
  bulgeCenter: number = 0.75;

  constructor(config?: Partial<LiquidConfig>) {
    const c = { ...DEFAULT_CONFIG, ...config };
    this.numPoints = c.numPoints;
    this.stiffness = c.stiffness;
    this.spread = c.spread;
    this.force = c.force;
    this.damping = c.damping;
    this.heights = new Float32Array(this.numPoints);
    this.velocities = new Float32Array(this.numPoints);
  }

  /**
   * Increase fill with a right-side splash impact.
   * Called when glow arrives at parent.
   */
  setTargetFill(level: number): void {
    const prev = this.targetFill;
    this.targetFill = Math.max(0, Math.min(1, level));
    const delta = this.targetFill - prev;
    if (delta <= 0) return;

    const amount = delta;
    const f = this.force * amount * 3;

    // Bulge from right side
    this.bulgeVel -= f * 1.5;
    this.bulgeCenter = 0.75;

    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);
      // Right-biased bell curve
      const bell = Math.exp(-((t - 0.75) ** 2) / 0.06);
      this.velocities[i] -= f * bell * (0.7 + Math.random() * 0.3);
      // Leftward momentum
      if (i > 0) {
        this.velocities[i - 1] -= f * 0.15 * Math.max(0, t - 0.3);
      }
    }
  }

  /**
   * Decrease fill with a mild left-side disturbance.
   * Called immediately when child is unchecked or new child added.
   */
  drain(level: number): void {
    const prev = this.targetFill;
    this.targetFill = Math.max(0, Math.min(1, level));
    const delta = prev - this.targetFill;
    if (delta <= 0) return;

    const f = this.force * delta * 1.5;

    // Mild left-side disturbance
    this.bulgeVel += f * 0.8;
    this.bulgeCenter = 0.25;

    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);
      const bell = Math.exp(-((t - 0.25) ** 2) / 0.08);
      this.velocities[i] += f * bell * (0.5 + Math.random() * 0.3);
    }
  }

  /** Run one physics step. Call each animation frame. */
  update(): void {
    // Ease fill toward target (slower rise for viscous feel)
    this.fill += (this.targetFill - this.fill) * 0.035;

    // Heavier damping for viscous feel
    const damp = this.damping * 0.985;
    for (let i = 0; i < this.numPoints; i++) {
      this.velocities[i] += -this.stiffness * this.heights[i];
      this.velocities[i] *= damp;
      this.heights[i] += this.velocities[i];
    }

    // Spread to neighbors (surface tension) — 6 iterations
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < this.numPoints; i++) {
        if (i > 0) {
          const d = this.spread * (this.heights[i] - this.heights[i - 1]);
          this.velocities[i - 1] += d;
        }
        if (i < this.numPoints - 1) {
          const d = this.spread * (this.heights[i] - this.heights[i + 1]);
          this.velocities[i + 1] += d;
        }
      }
    }

    // Bulge spring
    this.bulgeVel += -0.01 * this.bulge;
    this.bulgeVel *= 0.96;
    this.bulge += this.bulgeVel;
  }

  /** Returns true if the physics have settled (all motion negligible). */
  isSettled(): boolean {
    if (Math.abs(this.fill - this.targetFill) > 0.001) return false;
    if (Math.abs(this.bulge) > 0.001 || Math.abs(this.bulgeVel) > 0.001) return false;
    for (let i = 0; i < this.numPoints; i++) {
      if (Math.abs(this.velocities[i]) > 0.0001 || Math.abs(this.heights[i]) > 0.001) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the surface Y offset for each point.
   * Returns an array of { t, heightOffset, bulgeOffset } where:
   * - t is 0–1 across the surface width
   * - heightOffset is the spring displacement (multiply by desired pixel range)
   * - bulgeOffset is the bulge displacement (multiply by desired pixel range)
   */
  getSurface(): { t: number; heightOffset: number; bulgeOffset: number }[] {
    const result: { t: number; heightOffset: number; bulgeOffset: number }[] = [];
    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);
      const bell = Math.exp(-((t - this.bulgeCenter) ** 2) / 0.06);
      result.push({
        t,
        heightOffset: this.heights[i],
        bulgeOffset: this.bulge * bell,
      });
    }
    return result;
  }

  /**
   * Instantly snap fill to a level — no physics, no animation.
   * Used for manual checks that should feel instant.
   */
  snapTo(level: number): void {
    this.fill = level;
    this.targetFill = level;
    this.heights.fill(0);
    this.velocities.fill(0);
    this.bulge = 0;
    this.bulgeVel = 0;
  }

  /**
   * Instantly flush all liquid — no settling or splash.
   * Used when draining completely to empty.
   */
  flush(): void {
    this.fill = 0;
    this.targetFill = 0;
    this.heights.fill(0);
    this.velocities.fill(0);
    this.bulge = 0;
    this.bulgeVel = 0;
  }

  /** Reset all physics state. */
  reset(): void {
    this.fill = 0;
    this.targetFill = 0;
    this.heights.fill(0);
    this.velocities.fill(0);
    this.bulge = 0;
    this.bulgeVel = 0;
  }
}
