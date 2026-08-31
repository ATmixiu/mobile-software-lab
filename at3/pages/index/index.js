var categoryData = require('../../utils/categoryData.js')

Page({

  data: {
    activeNav: '首页',
    showDropdown: false,
    touchStartY: 0,

    navList: [],

    swiperNews: [],

    homeSections: [],

    allNews: [],
    searchResults: [],
    keyword: ''
  },

  onLoad: function () {
    let navList = categoryData.getNavList()
    let homeSections = categoryData.getHomeSections()
    let allNews = categoryData.getAllNews()

    let swiperNews = categoryData
      .getCategoryNews('海大要闻')
      .slice(0, 3)

    this.setData({
      navList: navList,
      homeSections: homeSections,
      allNews: allNews,
      swiperNews: swiperNews
    })
  },

  onNavTap: function (e) {
    let index = e.currentTarget.dataset.index
    let nav = this.data.navList[index]

    if (nav.children.length > 0) {
      let closeSame =
        this.data.activeNav === nav.name &&
        this.data.showDropdown

      this.setData({
        activeNav: nav.name,
        showDropdown: !closeSame
      })
    } else {
      this.setData({
        activeNav: '首页',
        showDropdown: false
      })
    }
  },

  onDropdownItemTap: function (e) {
    let name = e.currentTarget.dataset.name
    let parent = this.data.activeNav

    this.setData({
      showDropdown: false
    })

    wx.navigateTo({
      url:
        '../category/category?parent=' +
        encodeURIComponent(parent) +
        '&name=' +
        encodeURIComponent(name)
    })
  },

  goToCategory: function (e) {
    let name = e.currentTarget.dataset.name
    let parent = e.currentTarget.dataset.parent

    wx.navigateTo({
      url:
        '../category/category?parent=' +
        encodeURIComponent(parent) +
        '&name=' +
        encodeURIComponent(name)
    })
  },

  closeDropdown: function () {
    this.setData({
      showDropdown: false
    })
  },

  onMenuTouchStart: function (e) {
    this.setData({
      touchStartY: e.changedTouches[0].pageY
    })
  },

  onMenuTouchEnd: function (e) {
    let endY = e.changedTouches[0].pageY
    let distance = endY - this.data.touchStartY

    if (Math.abs(distance) > 50) {
      this.setData({
        showDropdown: false
      })
    }
  },

  onSearchInput: function (e) {
    let keyword = e.detail.value.trim()

    let result = []

    if (keyword) {
      result = this.data.allNews.filter(function (item) {
        return (
          item.title.indexOf(keyword) !== -1 ||
          item.summary.indexOf(keyword) !== -1
        )
      })
    }

    this.setData({
      keyword: keyword,
      searchResults: result,
      showDropdown: false
    })
  },

  clearSearch: function () {
    this.setData({
      keyword: '',
      searchResults: []
    })
  },

  goToDetail: function (e) {
    let id = e.currentTarget.dataset.id

    wx.navigateTo({
      url: '../detail/detail?id=' + id
    })
  }

})