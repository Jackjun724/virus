/**
 * 背景颜色、 正常、 潜伏期、 有症状的颜色 以及 圆大小(表示传播范围、人本质是一个坐标)
 *
 * @type {{background: string, arcColor: [string, string, string]}}
 */
let style = {
  background: '#070707',
  arcColor: ['rgba(255,0,0,0.78)', 'rgba(255,255,255,0.91)', 'rgba(255,255,0,0.85)'],
};

let Params = function () {
  this.infectionRate = 0.5;
  this.beginInfectionNum = 2;
  this.total = 1000;
  this.range = 3;
  this.hospitalResponseDays = 2;
  this.recoverDays = 20;
  this.recoverRate = 0.01;

  this.numOfBed = 100;

  this.dormantDays = 14;

  this.diedDays = 30;
  this.diedRate = 0.01;

  this.speed = 10;
  this.rangeOfActivity = 50;
};

let Evolution = function (canvasElement, param = new Params()) {
  // construct
  {
    if (!window.randomGaussian) {
      throw 'Not found p5.js dependents.'
    }
    if (canvasElement && canvasElement.getContext) {
      this.el = canvasElement;
      this.ctx = canvasElement.getContext('2d');
    } else {
      throw 'Browser version too low or element error.';
    }
  }

  /**
   * 绘制背景
   * @param ctx
   * @param el
   */
  let drawBackground = function (ctx, el) {
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, el.width, el.height);
  };

  /**
   * 画实心圆
   */
  let drawFillArc = (ctx, x, y, r, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, 360, false);
    ctx.fill();
    ctx.closePath();
  };

  this.population = [];
  this.intervalHandle = 0;
  this.bitArray = new BitArray((this.el.width + 1) * (this.el.height + 1));
  this.days = 0;
  this.dead = 0;
  this.useBed = 0;
  this.infection = param.beginInfectionNum;
  this.recover = 0;

  /**
   * 初始化群体
   */
  this.initPopulation = function () {
    this.population = [];
    let maxW = this.el.width;
    let maxH = this.el.height;
    for (let i = 0; i < param.total; i++) {
      // 初始化感染人群
      this.population[i] = new Individual(maxW, maxH, i < param.beginInfectionNum ? 2 : 1, param.speed, param.rangeOfActivity)
    }
  };

  this.count = 0;
  this.start = function (callback) {
    this.initPopulation();
    //定时绘制种群
    this.intervalHandle = setInterval(() => {
      // 擦除画布 重绘背景
      drawBackground(this.ctx, this.el);
      // 清空bit数组
      this.bitArray.clear();
      let addDays = this.count > 59;
      let r = param.range;
      // 绘制点 标记感染bit数组
      for (let i in this.population) {
        let item = this.population[i];
        let state = item.attr.state;
        if (state === 0 || state === 1 || state === 2) {
          drawFillArc(this.ctx, item.attr.x, item.attr.y, r, style.arcColor[state]);


          if (state !== 1 && addDays) {
            //标记感染bit数组
            this.bitArray.on(this.computePositionOfBitArray(item.attr));
          } else {
            // 计算下一次位置
            item.computeNext();
          }
        }
      }
      if (!addDays) {
        this.count++;
        return;
      }
      this.days++;
      this.count = 0;
      console.log("天:", this.days, "已用床位:", this.useBed, "总共床位:", param.numOfBed, "死亡:", this.dead, "恢复:", this.recover, "感染:", this.infection)
      callback(this.days, this.useBed, param.numOfBed, this.dead, this.recover, this.infection);
      // 进行感染
      for (let i in this.population) {
        let item = this.population[i];
        let currentState = item.attr.state;
        let currentStateDays = item.attr.days;
        if (currentState === 4 || currentState === 5) {
          // ignore
        } else if (currentState === 1) {
          // 获取周围传染源数量
          let dangerNum = this.bitArray.rangeHasTrue(item.attr, this.el.width + 1, this.el.height + 1, param.range);
          // 计算传染概率
          let rate = dangerNum * param.infectionRate;
          if (Math.random() < rate) {
            // 标记潜伏期
            item.attr.state = 2;
            item.attr.days = 0;
            this.infection++
          }
        } else if (currentState === 2) {
          if (currentStateDays >= param.dormantDays) {
            // 标记感染
            item.attr.state = 0;
            item.attr.days = 0
          } else {
            item.attr.days++
          }
        } else if (currentState === 0) {
          if (currentStateDays >= param.hospitalResponseDays) {
            if (param.numOfBed - this.useBed > 0) {
              // 标记隔离
              item.attr.state = 3;
              this.useBed++
            } else if (currentStateDays > param.diedDays && Math.random() < param.diedRate) {
              //计算致死
              item.attr.state = 5;
              this.dead++;
              this.useBed--;
            } else {
              item.attr.days++
            }
          } else {
            item.attr.days++
          }
        } else if (currentState === 3) {
          // 判断 死亡 or 恢复正常
          if (currentStateDays > param.diedDays) {
            if (Math.random() < param.diedRate) {
              item.attr.state = 5;
              this.dead++;
              this.useBed--;
            } else {
              item.attr.days++
            }
          } else if (currentStateDays >= param.recoverDays && Math.random() < param.recoverRate) {
            item.attr.state = 4;
            this.recover++;
            this.useBed--;
          } else {
            item.attr.days++
          }
        }
      }
    }, 16.67)
  };

  this.computePositionOfBitArray = ({x, y}) => y * (this.el.width + 1) + x;

  this.shutdown = function () {
    clearInterval(this.intervalHandle)
  }
};

let Individual = function (maxW, maxH, state, speed, range) {
  this.attr = {
    x: 0,
    y: 0,
    // 0 感染、 1 正常 、2 潜伏期、 3 隔离、 4 治愈 、 5 死亡
    state: 1,
    // 被感染天数
    days: -1,
    moveInc: {
      x: 0,
      y: 0,
      count: 0,
      random: 0,
    },
  };

  // construct
  {
    // 随机位置
    this.attr.x = window.randomGaussian(0, 1) * 100 + maxW / 2;
    this.attr.y = window.randomGaussian(0, 1) * 100 + maxH / 2;
    this.attr.moveInc.x = window.randomGaussian(0, 1) * range;
    this.attr.moveInc.y = window.randomGaussian(0, 1) * range;
    this.attr.moveInc.random = Math.random() * 100;
    this.attr.state = state
  }

  this.computeNext = function () {
    // 随机移动
    this.attr.x += this.attr.moveInc.x / (Math.min(maxW, maxH) - speed);
    this.attr.y += this.attr.moveInc.y / (Math.min(maxW, maxH) - speed);
    if (this.attr.moveInc.count++ > this.attr.moveInc.random) {
      this.attr.moveInc.x = window.randomGaussian(0, 1) * range;
      this.attr.moveInc.y = window.randomGaussian(0, 1) * range;
      this.attr.moveInc.count = 0
    }


    if (this.attr.x > maxW) {
      this.attr.x = maxW
    } else if (this.attr.x < 0) {
      this.attr.x = 0
    }

    if (this.attr.y > maxH) {
      this.attr.y = maxH
    } else if (this.attr.y < 0) {
      this.attr.y = 0
    }
  }

};
