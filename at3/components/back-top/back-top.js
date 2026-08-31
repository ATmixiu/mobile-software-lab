Component({

  methods: {

    backToTop: function () {

      wx.pageScrollTo({
        scrollTop: 0,
        duration: 350
      })

    }

  }

})