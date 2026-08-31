Component({

  data: {
    startX: 0,
    startY: 0,
    isBacking: false
  },

  methods: {

    touchStart: function (e) {
      if (!e.changedTouches || !e.changedTouches.length) {
        return
      }

      this.setData({
        startX: e.changedTouches[0].clientX,
        startY: e.changedTouches[0].clientY
      })
    },

    touchEnd: function (e) {
      if (!e.changedTouches || !e.changedTouches.length) {
        return
      }

      if (this.data.isBacking) {
        return
      }

      let endX = e.changedTouches[0].clientX
      let endY = e.changedTouches[0].clientY

      let moveX = endX - this.data.startX
      let moveY = endY - this.data.startY

      let horizontalDistance = Math.abs(moveX)
      let verticalDistance = Math.abs(moveY)

      if (
        horizontalDistance >= 80 &&
        horizontalDistance > verticalDistance * 1.5
      ) {

        let pages = getCurrentPages()

        if (pages.length > 1) {

          this.setData({
            isBacking: true
          })

          wx.navigateBack({
            delta: 1,

            complete: () => {
              setTimeout(() => {
                this.setData({
                  isBacking: false
                })
              }, 300)
            }
          })

        }

      }
    }

  }

})