// pages/index/index.js

const levelData = require("../../utils/levels.js")
const progress = require("../../utils/progress.js")


Page({

  data: {

    showHelp: false,

    lastLevel: 0,

    unlockLevel: 0,

    unlockedCount: 1,

    totalCount: 0

  },


  onShow() {

    this.loadProgress()

  },


  // 加载游戏进度
  loadProgress() {

    const totalCount = levelData.levels.length

    let unlockLevel = progress.getUnlockLevel()

    let lastLevel = wx.getStorageSync("lastLevel")


    if (
      lastLevel === "" ||
      lastLevel === undefined ||
      lastLevel === null
    ) {

      lastLevel = 0

    }


    lastLevel = Number(lastLevel)


    if (lastLevel < 0) {

      lastLevel = 0

    }


    if (lastLevel >= totalCount) {

      lastLevel = totalCount - 1

    }


    // 防止继续到还没解锁的关卡
    if (lastLevel > unlockLevel) {

      lastLevel = unlockLevel

    }


    const unlockedCount = Math.min(

      unlockLevel + 1,

      totalCount

    )


    this.setData({

      lastLevel: lastLevel,

      unlockLevel: unlockLevel,

      unlockedCount: unlockedCount,

      totalCount: totalCount

    })

  },


  // 开始游戏
  startGame() {

    wx.navigateTo({

      url: "/pages/game/game?level=0"

    })

  },


  // 继续游戏
  continueGame() {

    wx.navigateTo({

      url:
        "/pages/game/game?level=" +
        this.data.lastLevel

    })

  },


  // 关卡选择
  chooseLevel() {

    wx.navigateTo({

      url: "/pages/levels/levels"

    })

  },


  // 打开游戏说明
  showHelp() {

    this.setData({

      showHelp: true

    })

  },


  // 关闭游戏说明
  closeHelp() {

    this.setData({

      showHelp: false

    })

  }

})