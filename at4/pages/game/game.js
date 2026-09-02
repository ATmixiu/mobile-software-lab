// pages/game/game.js

const levels = require("../../utils/levels.js")
const progress = require("../../utils/progress.js")


Page({

  data: {

    // 当前关卡，从0开始
    level: 0,

    // 当前关卡名称
    levelName: "",

    // 原始地图
    map: [],

    // 玩家当前位置
    player: {},

    // 所有箱子位置
    boxes: [],

    // 所有目标位置
    targets: [],

    // 当前步数
    steps: 0,

    // 当前计时
    time: "00:00",

    // 当前关卡最佳步数
    bestSteps: "暂无",

    // 是否显示通关动画
    showWin: false,

    // 当前关卡是否已经完成
    isFinished: false

  },


  // 撤销历史
  history: [],

  // 计时器
  timer: null,

  // 已经过的秒数
  seconds: 0,


  /* ==============================
     页面加载
  ============================== */

  onLoad(options) {

    let level = Number(options.level || 0)

    // 防止关卡编号错误
    if (
      level < 0 ||
      level >= levels.levels.length
    ) {
      level = 0
    }


    this.setData({
      level: level
    })


    // 保存当前位置，用于首页“继续游戏”
    wx.setStorageSync(
      "lastLevel",
      level
    )


    this.loadBest()

    this.initGame()

  },


  /* ==============================
     页面卸载
  ============================== */

  onUnload() {

    this.stopTimer()

  },


  /* ==============================
     读取最佳成绩
  ============================== */

  loadBest() {

    const best = progress.getBest(
      this.data.level
    )


    this.setData({

      bestSteps:
        best !== null &&
        best !== undefined &&
        best !== ""
          ? best
          : "暂无"

    })

  },


  /* ==============================
     初始化当前关卡
  ============================== */

  initGame() {

    // 停止之前的计时器
    this.stopTimer()


    // 清除撤销记录
    this.history = []


    // 时间重新开始
    this.seconds = 0


    // 深拷贝地图，防止修改原始关卡
    const map = JSON.parse(
      JSON.stringify(
        levels.levels[this.data.level].map
      )
    )


    let player = {}

    const boxes = []

    const targets = []


    // 遍历地图
    for (
      let row = 0;
      row < map.length;
      row++
    ) {

      for (
        let col = 0;
        col < map[row].length;
        col++
      ) {

        const value = map[row][col]


        // 3 = 玩家
        if (value === 3) {

          player = {
            row: row,
            col: col
          }

        }


        // 2 = 箱子
        if (value === 2) {

          boxes.push({
            row: row,
            col: col
          })

        }


        // 4 = 目标
        if (value === 4) {

          targets.push({
            row: row,
            col: col
          })

        }

      }

    }


    this.setData({

      levelName:
        levels.levels[this.data.level].name,

      map: map,

      player: player,

      boxes: boxes,

      targets: targets,

      steps: 0,

      time: "00:00",

      showWin: false,

      isFinished: false

    })


    // 保存当前关卡
    wx.setStorageSync(
      "lastLevel",
      this.data.level
    )


    // 绘制游戏
    this.drawCanvas()


    // 开始计时
    this.startTimer()

  },


  /* ==============================
     开始计时
  ============================== */

  startTimer() {

    // 防止多个计时器同时运行
    this.stopTimer()


    this.timer = setInterval(() => {

      this.seconds++


      const minute =
        Math.floor(
          this.seconds / 60
        )


      const second =
        this.seconds % 60


      this.setData({

        time:
          this.formatNumber(minute) +
          ":" +
          this.formatNumber(second)

      })

    }, 1000)

  },


  /* ==============================
     停止计时
  ============================== */

  stopTimer() {

    if (this.timer) {

      clearInterval(this.timer)

      this.timer = null

    }

  },


  /* ==============================
     时间补0
     5 -> 05
  ============================== */

  formatNumber(number) {

    if (number < 10) {

      return "0" + number

    }

    return String(number)

  },


  /* ==============================
     绘制 Canvas
  ============================== */

  drawCanvas() {

    const map = this.data.map


    if (
      !map ||
      map.length === 0
    ) {
      return
    }


    const ctx =
      wx.createCanvasContext(
        "gameCanvas",
        this
      )


    /*
     * 和最新 game.wxss 对应：
     *
     * .canvas {
     *   width: 72vw;
     *   height: 72vw;
     * }
     *
     * 所以这里也使用屏幕宽度的72%
     */

    const windowInfo =
      wx.getWindowInfo()


    const canvasWidth =
      windowInfo.windowWidth * 0.72


    // 地图行数
    const rows = map.length


    // 找出地图最大列数
    let cols = 0


    for (
      let i = 0;
      i < map.length;
      i++
    ) {

      if (
        map[i].length > cols
      ) {
        cols = map[i].length
      }

    }


    // 每个格子的尺寸
    const cellSize = Math.min(
      canvasWidth / cols,
      canvasWidth / rows
    )


    // 地图实际宽高
    const mapWidth =
      cols * cellSize

    const mapHeight =
      rows * cellSize


    // 让地图在Canvas中居中
    const offsetX =
      (canvasWidth - mapWidth) / 2

    const offsetY =
      (canvasWidth - mapHeight) / 2


    /* ==============================
       绘制地图背景
    ============================== */

    for (
      let row = 0;
      row < rows;
      row++
    ) {

      for (
        let col = 0;
        col < map[row].length;
        col++
      ) {

        const x =
          offsetX +
          col * cellSize

        const y =
          offsetY +
          row * cellSize


        /*
         * 1 = 石墙
         */

        if (
          map[row][col] === 1
        ) {

          ctx.drawImage(

            "/images/icons/stone.png",

            x,

            y,

            cellSize,

            cellSize

          )

        } else {

          /*
           * 其他位置绘制冰面
           */

          ctx.drawImage(

            "/images/icons/ice.png",

            x,

            y,

            cellSize,

            cellSize

          )

        }

      }

    }


    /* ==============================
       绘制目标位置
       bird.png
    ============================== */

    this.data.targets.forEach(
      target => {

        ctx.drawImage(

          "/images/icons/bird.png",

          offsetX +
            target.col * cellSize,

          offsetY +
            target.row * cellSize,

          cellSize,

          cellSize

        )

      }
    )


    /* ==============================
       绘制箱子
    ============================== */

    this.data.boxes.forEach(
      box => {

        ctx.drawImage(

          "/images/icons/box.png",

          offsetX +
            box.col * cellSize,

          offsetY +
            box.row * cellSize,

          cellSize,

          cellSize

        )

      }
    )


    /* ==============================
       绘制玩家
       pig.png
    ============================== */

    if (
      this.data.player.row !== undefined &&
      this.data.player.col !== undefined
    ) {

      ctx.drawImage(

        "/images/icons/pig.png",

        offsetX +
          this.data.player.col *
          cellSize,

        offsetY +
          this.data.player.row *
          cellSize,

        cellSize,

        cellSize

      )

    }


    // 真正绘制
    ctx.draw()

  },


  /* ==============================
     玩家移动核心
  ============================== */

  move(direction) {

    // 通关动画期间禁止移动
    if (
      this.data.showWin ||
      this.data.isFinished
    ) {
      return
    }


    let row =
      this.data.player.row

    let col =
      this.data.player.col


    /* ==============================
       计算下一步
    ============================== */

    if (
      direction === "up"
    ) {

      row--

    } else if (
      direction === "down"
    ) {

      row++

    } else if (
      direction === "left"
    ) {

      col--

    } else if (
      direction === "right"
    ) {

      col++

    }


    /* ==============================
       玩家不能走出地图
    ============================== */

    if (
      !this.isInside(
        row,
        col
      )
    ) {

      return

    }


    /* ==============================
       玩家不能穿墙
    ============================== */

    if (
      this.data.map[row][col] === 1
    ) {

      return

    }


    /* ==============================
       判断前面有没有箱子
    ============================== */

    const boxIndex =
      this.findBox(
        row,
        col
      )


    // 复制当前箱子状态
    const newBoxes =
      JSON.parse(
        JSON.stringify(
          this.data.boxes
        )
      )


    /* ==============================
       如果前面有箱子
    ============================== */

    if (
      boxIndex !== -1
    ) {

      let newBoxRow = row

      let newBoxCol = col


      if (
        direction === "up"
      ) {

        newBoxRow--

      } else if (
        direction === "down"
      ) {

        newBoxRow++

      } else if (
        direction === "left"
      ) {

        newBoxCol--

      } else if (
        direction === "right"
      ) {

        newBoxCol++

      }


      /*
       * 箱子不能推出地图
       */

      if (
        !this.isInside(
          newBoxRow,
          newBoxCol
        )
      ) {

        return

      }


      /*
       * 箱子不能推进墙里
       */

      if (
        this.data.map[
          newBoxRow
        ][
          newBoxCol
        ] === 1
      ) {

        return

      }


      /*
       * 箱子不能推进另一个箱子
       */

      if (
        this.findBox(
          newBoxRow,
          newBoxCol
        ) !== -1
      ) {

        return

      }


      /*
       * 推动箱子
       */

      newBoxes[boxIndex] = {

        row: newBoxRow,

        col: newBoxCol

      }

    }


    /* ==============================
       移动成功前保存历史
       用于撤销
    ============================== */

    this.history.push({

      player:
        JSON.parse(
          JSON.stringify(
            this.data.player
          )
        ),

      boxes:
        JSON.parse(
          JSON.stringify(
            this.data.boxes
          )
        )

    })


    /* ==============================
       更新玩家和箱子
    ============================== */

    this.setData({

      player: {

        row: row,

        col: col

      },

      boxes: newBoxes,

      steps:
        this.data.steps + 1

    })


    // 重新绘制
    this.drawCanvas()


    // 检查通关
    if (
      this.checkWin()
    ) {

      this.win()

    }

  },


  /* ==============================
     判断坐标是否在地图中
  ============================== */

  isInside(row, col) {

    if (
      row < 0 ||
      row >= this.data.map.length
    ) {

      return false

    }


    if (
      col < 0 ||
      col >=
        this.data.map[row].length
    ) {

      return false

    }


    return true

  },


  /* ==============================
     查找某个位置是否有箱子
  ============================== */

  findBox(row, col) {

    for (
      let index = 0;
      index <
        this.data.boxes.length;
      index++
    ) {

      const box =
        this.data.boxes[index]


      if (
        box.row === row &&
        box.col === col
      ) {

        return index

      }

    }


    return -1

  },


  /* ==============================
     上下左右按钮
  ============================== */

  up() {

    this.move("up")

  },


  down() {

    this.move("down")

  },


  left() {

    this.move("left")

  },


  right() {

    this.move("right")

  },


  /* ==============================
     撤销一步
  ============================== */

  undo() {

    // 通关后不能撤销
    if (
      this.data.isFinished
    ) {

      return

    }


    // 没有历史步骤
    if (
      this.history.length === 0
    ) {

      wx.showToast({

        title: "已经是第一步了",

        icon: "none"

      })

      return

    }


    // 获取上一个状态
    const last =
      this.history.pop()


    this.setData({

      player:
        last.player,

      boxes:
        last.boxes,

      steps:
        Math.max(
          this.data.steps - 1,
          0
        )

    })


    // 重新绘制
    this.drawCanvas()

  },


  /* ==============================
     判断是否通关
  ============================== */

  checkWin() {

    /*
     * 没有目标位置时
     * 不允许直接判定成功
     */

    if (
      this.data.targets.length === 0
    ) {

      return false

    }


    /*
     * 每一个目标位置上
     * 都必须存在箱子
     */

    for (
      let i = 0;
      i <
        this.data.targets.length;
      i++
    ) {

      const target =
        this.data.targets[i]


      let hasBox = false


      for (
        let j = 0;
        j <
          this.data.boxes.length;
        j++
      ) {

        const box =
          this.data.boxes[j]


        if (
          box.row ===
            target.row &&
          box.col ===
            target.col
        ) {

          hasBox = true

          break

        }

      }


      if (
        !hasBox
      ) {

        return false

      }

    }


    return true

  },


  /* ==============================
     通关
  ============================== */

  win() {

    // 防止重复触发
    if (
      this.data.isFinished
    ) {

      return

    }


    // 停止计时
    this.stopTimer()


    this.setData({

      isFinished: true

    })


    /* ==============================
       保存最佳成绩
    ============================== */

    progress.saveBest(

      this.data.level,

      this.data.steps

    )


    /* ==============================
       解锁下一关
    ============================== */

    if (
      this.data.level <
        levels.levels.length - 1
    ) {

      progress.unlock(

        this.data.level + 1

      )

    }


    /* ==============================
       更新最佳成绩
    ============================== */

    const best =
      progress.getBest(
        this.data.level
      )


    this.setData({

      bestSteps:
        best !== null &&
        best !== undefined &&
        best !== ""
          ? best
          : this.data.steps,

      showWin: true

    })


    /* ==============================
       先显示通关动画
    ============================== */

    setTimeout(() => {

      this.setData({

        showWin: false

      })


      const isLastLevel =
        this.data.level ===
        levels.levels.length - 1


      /* ==============================
         最后一关
      ============================== */

      if (
        isLastLevel
      ) {

        wx.showModal({

          title:
            "全部通关！",

          content:
            "恭喜你完成全部关卡！" +
            "\n\n步数：" +
            this.data.steps +
            "\n用时：" +
            this.data.time,

          showCancel: false,

          confirmText:
            "返回主页",

          success: () => {

            wx.reLaunch({

              url:
                "/pages/index/index"

            })

          }

        })


        return

      }


      /* ==============================
         普通关卡
      ============================== */

      wx.showModal({

        title:
          "恭喜通关",

        content:
          "本关步数：" +
          this.data.steps +
          "\n用时：" +
          this.data.time,

        confirmText:
          "下一关",

        cancelText:
          "返回选关",

        success: res => {

          if (
            res.confirm
          ) {

            this.nextLevel()

          } else {

            /*
             * 返回上一页。
             *
             * 如果是从关卡选择页面进入，
             * 就会回到关卡选择页面。
             */

            wx.navigateBack()

          }

        }

      })

    }, 1200)

  },


  /* ==============================
     下一关
  ============================== */

  nextLevel() {

    const next =
      this.data.level + 1


    if (
      next >=
      levels.levels.length
    ) {

      return

    }


    this.setData({

      level: next

    })


    // 保存“继续游戏”
    wx.setStorageSync(

      "lastLevel",

      next

    )


    // 加载下一关最佳成绩
    this.loadBest()


    // 初始化下一关
    this.initGame()

  },


  /* ==============================
     重新开始
  ============================== */

  restartGame() {

    // 已经通关时不执行
    if (
      this.data.showWin
    ) {

      return

    }


    // 如果一步都没走
    // 直接重新开始即可
    if (
      this.data.steps === 0
    ) {

      this.initGame()

      return

    }


    wx.showModal({

      title:
        "重新开始",

      content:
        "确定重新开始当前关卡吗？",

      confirmText:
        "重新开始",

      cancelText:
        "取消",

      success: res => {

        if (
          res.confirm
        ) {

          this.initGame()

        }

      }

    })

  },


  /* ==============================
     返回上一页
  ============================== */

  backHome() {

    if (
      this.data.showWin
    ) {

      return

    }


    // 暂停计时
    this.stopTimer()


    wx.showModal({

      title:
        "退出关卡",

      content:
        "确定退出当前游戏吗？",

      confirmText:
        "退出",

      cancelText:
        "继续游戏",

      success: res => {

        if (
          res.confirm
        ) {

          wx.navigateBack()

        } else {

          // 取消退出后继续计时
          if (
            !this.data.isFinished
          ) {

            this.startTimer()

          }

        }

      }

    })

  }

})