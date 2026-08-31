var common = require('../../utils/common.js')
var categoryData = require('../../utils/categoryData.js')

Page({

  data: {
    article: {},
    paragraphs: [],
    isAdd: false
  },

  onLoad: function (options) {
    let id = options.id

    let savedArticle = wx.getStorageSync(id)

    if (savedArticle && savedArticle.id) {
      this.showArticle(savedArticle, true)
      return
    }

    let result = categoryData.getNewsDetail(id)

    if (result.code != '200') {
      result = common.getNewsDetail(id)
    }

    if (result.code == '200') {
      this.showArticle(result.news, false)
    }
  },

  showArticle: function (article, isAdd) {
    let paragraphs = []

    if (article.content) {
      paragraphs = article.content
        .split('\n')
        .filter(function (item) {
          return item.trim() !== ''
        })
    }

    this.setData({
      article: article,
      paragraphs: paragraphs,
      isAdd: isAdd
    })

    wx.setNavigationBarTitle({
      title: article.category || '新闻详情'
    })

    this.saveReadingHistory(article)
  },

  saveReadingHistory: function (article) {
    if (!article || !article.id) {
      return
    }

    let history = wx.getStorageSync('__reading_history__')

    if (!Array.isArray(history)) {
      history = []
    }

    history = history.filter(function (item) {
      return item.id != article.id
    })

    let now = new Date()

    let month = String(now.getMonth() + 1).padStart(2, '0')
    let day = String(now.getDate()).padStart(2, '0')
    let hour = String(now.getHours()).padStart(2, '0')
    let minute = String(now.getMinutes()).padStart(2, '0')

    history.unshift({
      id: article.id,
      title: article.title,
      add_date: article.add_date || '',
      category: article.category || '新闻',
      view_time:
        month +
        '-' +
        day +
        ' ' +
        hour +
        ':' +
        minute
    })

    if (history.length > 20) {
      history = history.slice(0, 20)
    }

    wx.setStorageSync('__reading_history__', history)
  },

  addFavorites: function () {
    let article = this.data.article

    wx.setStorageSync(article.id, article)

    this.setData({
      isAdd: true
    })

    wx.showToast({
      title: '收藏成功',
      icon: 'success'
    })
  },

  cancelFavorites: function () {
    let article = this.data.article

    wx.removeStorageSync(article.id)

    this.setData({
      isAdd: false
    })

    wx.showToast({
      title: '已取消收藏',
      icon: 'none'
    })
  }

})