// pages/levels/levels.js

const levelData = require("../../utils/levels.js")
const progress = require("../../utils/progress.js")


Page({

  data: {

    levels: [],

    unlockLevel: 0,

    unlockedCount: 1,

    totalCount: 0,

    progressPercent: 0,

    progressStyle: "width: 0%;"

  },


  onShow() {

    this.loadLevels()

  },


  loadLevels() {

    const totalCount =
      levelData.levels.length


    let unlockLevel =
      progress.getUnlockLevel()


    if (unlockLevel < 0) {

      unlockLevel = 0

    }


    if (
      unlockLevel >= totalCount
    ) {

      unlockLevel =
        totalCount - 1

    }


    const unlockedCount =
      Math.min(

        unlockLevel + 1,

        totalCount

      )


    const progressPercent =

      totalCount > 0

        ? Math.round(

            unlockedCount /
            totalCount *
            100

          )

        : 0


    const progressStyle =

      "width: " +

      progressPercent +

      "%;"


    const list =
      levelData.levels.map(

        (item, index) => {

          const best =
            progress.getBest(index)


          return {

            index: index,

            name: item.name,

            unlock:
              index <= unlockLevel,

            best:
              best
                ? best + "步"
                : "暂无",

            image:
              "/images/level0" +
              (index + 1) +
              ".png"

          }

        }

      )


    this.setData({

      levels: list,

      unlockLevel: unlockLevel,

      unlockedCount: unlockedCount,

      totalCount: totalCount,

      progressPercent: progressPercent,

      progressStyle: progressStyle

    })

  },


  startLevel(e) {

    const index =
      Number(
        e.currentTarget.dataset.index
      )


    if (
      index >
      this.data.unlockLevel
    ) {

      wx.showToast({

        title:
          "请先完成前面的关卡",

        icon: "none"

      })

      return

    }


    wx.navigateTo({

      url:
        "/pages/game/game?level=" +
        index

    })

  },


  backHome() {

    wx.navigateBack()

  }

})