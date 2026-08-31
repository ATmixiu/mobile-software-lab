Page({

  data: {
    isLogin: false,

    src: '',
    nickName: '',

    showLoginPopup: false,
    tempAvatar: '',
    tempNickName: '',

    currentTab: 'favorite',

    number: 0,
    newsList: [],

    historyNumber: 0,
    historyList: []
  },

  openLoginPopup: function () {
    this.setData({
      showLoginPopup: true
    })
  },

  closeLoginPopup: function () {
    this.setData({
      showLoginPopup: false
    })
  },

  stopTap: function () {},

  onChooseAvatar: function (e) {
    this.setData({
      tempAvatar: e.detail.avatarUrl
    })
  },

  onNickNameInput: function (e) {
    this.setData({
      tempNickName: e.detail.value
    })
  },

  confirmLogin: function () {
    let avatar = this.data.tempAvatar
    let nickName = this.data.tempNickName.trim()

    if (!avatar) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      })
      return
    }

    if (!nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({
      isLogin: true,
      src: avatar,
      nickName: nickName,
      showLoginPopup: false
    })

    this.getMyFavorites()
    this.getReadingHistory()
  },

  logout: function () {
    let that = this

    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',

      success: function (res) {
        if (res.confirm) {
          that.setData({
            isLogin: false,
            src: '',
            nickName: '',
            tempAvatar: '',
            tempNickName: '',
            currentTab: 'favorite',
            number: 0,
            newsList: [],
            historyNumber: 0,
            historyList: []
          })
        }
      }
    })
  },

  switchTab: function (e) {
    let tab = e.currentTarget.dataset.tab

    this.setData({
      currentTab: tab
    })
  },

  getMyFavorites: function () {
    let info = wx.getStorageInfoSync()
    let keys = info.keys

    let myList = []

    for (let i = 0; i < keys.length; i++) {
      let obj = wx.getStorageSync(keys[i])

      if (
        obj &&
        !Array.isArray(obj) &&
        obj.id &&
        obj.title
      ) {
        myList.push(obj)
      }
    }

    this.setData({
      newsList: myList,
      number: myList.length
    })
  },

  getReadingHistory: function () {
    let history = wx.getStorageSync('__reading_history__')

    if (!Array.isArray(history)) {
      history = []
    }

    this.setData({
      historyList: history,
      historyNumber: history.length
    })
  },

  clearHistory: function () {
    let that = this

    if (this.data.historyNumber == 0) {
      return
    }

    wx.showModal({
      title: '清空浏览历史',
      content: '确定清空全部浏览记录吗？',

      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('__reading_history__')

          that.setData({
            historyList: [],
            historyNumber: 0
          })

          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  goToDetail: function (e) {
    let id = e.currentTarget.dataset.id

    wx.navigateTo({
      url: '../detail/detail?id=' + id
    })
  },

  onShow: function () {
    if (this.data.isLogin) {
      this.getMyFavorites()
      this.getReadingHistory()
    }
  }

})