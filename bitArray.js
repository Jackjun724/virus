/**
 * 定制的bit数组 高速查找
 */
class BitArray {
  constructor(length) {
    this.backingArray = Array.from({length: Math.ceil(length / 32)}, () => 0);
    this.length = length
  }

  get(n) {
    return (this.backingArray[n / 32 | 0] & 1 << n % 32) > 0
  }

  on(n) {
    this.backingArray[n / 32 | 0] |= 1 << n % 32
  }

  off(n) {
    this.backingArray[n / 32 | 0] &= ~(1 << n % 32)
  }

  toggle(n) {
    this.backingArray[n / 32 | 0] ^= 1 << n % 32
  }

  clear() {
    for (let i = 0; i < this.backingArray.length; i++) {
      this.backingArray[i] = 0;
    }
  }

  /**
   * 返回矩形范围内感染点数量
   * 将bit数组视为矩阵 x,y 在bit数组中的位置为 y * w + x
   * @param x source x
   * @param y source y
   * @param w max w
   * @param h max h
   * @param range range
   */
  rangeHasTrue({x, y}, w, h, range) {
    let count = 0;
    let beginX, endX, beginY, endY;
    beginX = (beginX = x - range) >= 0 ? beginX : 0;
    endX = (endX = x + range) <= w ? endX : w;
    beginY = (beginY = y - range) >= 0 ? beginY : 0;
    endY = (endY = y + range) <= h ? endY : h;
    for (let i = beginX; i <= endX; i++) {
      for (let j = beginY; j <= endY; j++) {
        if (this.get(j * w + i)) {
          count++
        }
      }
    }
    return count;
  }

  forEach(callback) {
    this.backingArray.forEach((number, container) => {
      const max = container === this.backingArray.length - 1 ? this.length % 32 : 32;
      for (let x = 0; x < max; x++) {
        callback((number & 1 << x) > 0, 32 * container + x)
      }
    })
  }
}
