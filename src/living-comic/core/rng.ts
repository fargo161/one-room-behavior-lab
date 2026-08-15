/**
 * Language-portable xorshift32 RNG. All operations intentionally use unsigned
 * 32-bit arithmetic so future C# fixtures can reproduce the exact sequence.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    const normalized = seed >>> 0;
    this.state = normalized === 0 ? 0x6d2b79f5 : normalized;
  }

  nextUint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("maxExclusive must be a positive integer");
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error("Cannot pick from an empty collection");
    return values[this.integer(values.length)] as T;
  }

  shuffle<T>(values: readonly T[]): T[] {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = this.integer(index + 1);
      [copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
    }
    return copy;
  }
}
