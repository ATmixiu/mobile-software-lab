var categoryData = require('../../utils/categoryData.js')

Page({

  data: {
    parent: '',
    categoryName: '',
    newsList: []
  },

  onLoad: function (options) {
    let parent = decodeURIComponent(options.parent || '')
    let name = decodeURIComponent(options.name || '')

    let list = categoryData.getCategoryNews(name)

    this.setData({
      parent: parent,
      categoryName: name,
      newsList: list
    })

    wx.setNavigationBarTitle({
      title: name
    })
  },

  goToHome: function () {
    wx.switchTab({
      url: '../index/index'
    })
  },

  goToDetail: function (e) {
    let id = e.currentTarget.dataset.id

    wx.navigateTo({
      url: '../detail/detail?id=' + id
    })
  }

})