// pages/index/index.js
const app = getApp()

Page({
  data: {
    photoList: [],
    filteredList: [],
    loading: true,
    error: '',
    userInfo: null,
    openid: '',
    categories: ['全部', '风景', '美食', '校园', '萌宠', '生活', '其他'],
    currentCategory: '全部',
    searchKeyword: '',
    searchInputValue: '',
    page: 0,
    pageSize: 10,
    hasMore: true,
    isLoadingMore: false
  },

  onLoad: function () {
    this.initUserInfo();
    this.loadPhotos();
  },

  onShow: function () {
    if (this.data.photoList.length > 0 && !this.data.loading) {
      this.refreshPhotos();
    }
  },

  // 初始化用户信息
  initUserInfo: function () {
    const that = this;
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
    if (app.globalData.openid) {
      this.setData({ openid: app.globalData.openid });
    } else {
      const checkOpenid = setInterval(function () {
        if (app.globalData.openid) {
          that.setData({ openid: app.globalData.openid });
          clearInterval(checkOpenid);
        }
      }, 500);
      setTimeout(function () { clearInterval(checkOpenid); }, 10000);
    }
  },

  // 加载图片列表（第一页）
  loadPhotos: function () {
    const that = this;
    this.setData({
      loading: true,
      error: '',
      page: 0,
      hasMore: true
    });

    this.fetchPhotos(0, function (photos) {
      that.setData({
        photoList: photos,
        loading: false
      });
      that.applyFilters();
    }, function (err) {
      that.setData({
        loading: false,
        error: '加载失败，请下拉刷新重试'
      });
    });
  },

  // 刷新图片列表
  refreshPhotos: function () {
    const that = this;
    this.setData({
      page: 0,
      hasMore: true
    });

    this.fetchPhotos(0, function (photos) {
      that.setData({ photoList: photos });
      that.applyFilters();
    }, function () {});
  },

  // 从数据库获取图片
  fetchPhotos: function (page, success, fail) {
    const that = this;
    const db = wx.cloud.database();
    let query = db.collection('lab6_photos');

    // 分类筛选
    if (this.data.currentCategory !== '全部') {
      query = query.where({ category: this.data.currentCategory });
    }

    query.orderBy('createTime', 'desc')
      .skip(page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get({
        success: function (res) {
          console.log('查询图片列表成功', res);
          const photos = res.data.map(function (item) {
            return {
              _id: item._id,
              _openid: item._openid,
              photoUrl: item.photoUrl,
              avatarUrl: item.avatarUrl || '',
              nickName: item.nickName || '微信用户',
              country: item.country || '',
              province: item.province || '',
              city: item.city || '',
              addDate: item.addDate || '',
              createTime: item.createTime,
              title: item.title || '图片分享',
              description: item.description || '',
              category: item.category || '其他',
              likeCount: item.likeCount || 0,
              commentCount: item.commentCount || 0
            };
          });
          success(photos);
        },
        fail: function (err) {
          console.error('查询图片列表失败', err);
          fail(err);
        }
      });
  },

  // 应用分类和搜索筛选
  applyFilters: function () {
    let list = this.data.photoList;
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase();

    if (keyword) {
      list = list.filter(function (item) {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const nickName = (item.nickName || '').toLowerCase();
        return title.indexOf(keyword) >= 0 ||
               description.indexOf(keyword) >= 0 ||
               category.indexOf(keyword) >= 0 ||
               nickName.indexOf(keyword) >= 0;
      });
    }

    this.setData({ filteredList: list });
  },

  // 分类切换
  onCategoryChange: function (e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) {
      return;
    }
    this.setData({ currentCategory: category });
    this.loadPhotos();
  },

  // 搜索输入
  onSearchInput: function (e) {
    const that = this;
    const value = e.detail.value;
    this.setData({ searchInputValue: value });

    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }

    const timer = setTimeout(function () {
      that.setData({
        searchKeyword: value,
        searchTimer: null
      });
      that.applyFilters();
    }, 300);

    this.setData({ searchTimer: timer });
  },

  // 清除搜索
  onClearSearch: function () {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    this.setData({
      searchInputValue: '',
      searchKeyword: '',
      searchTimer: null
    });
    this.applyFilters();
  },

  // 上拉加载更多
  onReachBottom: function () {
    const that = this;
    if (this.data.isLoadingMore || !this.data.hasMore || this.data.loading) {
      return;
    }

    this.setData({ isLoadingMore: true });
    const nextPage = this.data.page + 1;

    this.fetchPhotos(nextPage, function (photos) {
      if (photos.length < that.data.pageSize) {
        that.setData({ hasMore: false });
      }
      const newList = that.data.photoList.concat(photos);
      that.setData({
        page: nextPage,
        photoList: newList,
        isLoadingMore: false
      });
      that.applyFilters();
    }, function () {
      that.setData({ isLoadingMore: false });
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.refreshPhotos();
    wx.stopPullDownRefresh();
  },

  // 点击用户头像/昵称
  onUserTap: function (e) {
    const openid = e.currentTarget.dataset.openid;
    const nickName = e.currentTarget.dataset.nickname;
    if (openid) {
      wx.navigateTo({
        url: '/pages/homepage/homepage?openid=' + openid + '&nickName=' + encodeURIComponent(nickName || '')
      });
    }
  },

  // 点击图片
  onPhotoTap: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: '/pages/detail/detail?id=' + id
      });
    }
  },

  // 点击发布按钮
  onAddTap: function () {
    wx.switchTab({
      url: '/pages/add/add'
    });
  }
});
