// pages/homepage/homepage.js
const app = getApp()

Page({
  data: {
    openid: '',
    nickName: '',
    avatarUrl: '',
    country: '',
    province: '',
    city: '',
    photoList: [],
    loading: true,
    error: '',
    // 统计数据
    photoCount: 0,
    likeCount: 0,
    categoryCount: 0,
    // 是否是当前登录用户
    isOwner: false,
    // 编辑资料弹窗
    showEditModal: false,
    editAvatar: '',
    editNickName: '',
    saving: false,
    avatarUploading: false
  },

  onLoad: function (options) {
    const openid = options.openid || '';
    const nickName = options.nickName ? decodeURIComponent(options.nickName) : '';
    
    this.setData({
      openid: openid,
      nickName: nickName
    });

    // 检查是否是当前登录用户
    this.checkOwner();

    if (openid) {
      this.loadUserPhotos();
      // 如果是当前用户，尝试从lab6_users获取最新资料
      if (this.data.isOwner) {
        this.loadLatestProfile();
      }
    } else {
      this.setData({
        loading: false,
        error: '缺少用户信息'
      });
    }
  },

  onShow: function () {
    // 页面显示时重新检查是否是当前用户
    this.checkOwner();
    if (this.data.isOwner) {
      this.loadLatestProfile();
    }
  },

  // 检查是否是当前登录用户
  checkOwner: function () {
    const currentOpenid = app.globalData.openid;
    const isOwner = currentOpenid && this.data.openid && currentOpenid === this.data.openid;
    this.setData({ isOwner: isOwner });
  },

  // 从lab6_users获取最新用户资料
  loadLatestProfile: function () {
    const that = this;
    if (!this.data.openid) return;

    const db = wx.cloud.database();
    db.collection('lab6_users')
      .where({ openid: this.data.openid })
      .get({
        success: function (res) {
          if (res.data && res.data.length > 0) {
            const profile = res.data[0];
            that.setData({
              avatarUrl: profile.avatarUrl || that.data.avatarUrl,
              nickName: profile.nickName || that.data.nickName
            });
          }
        },
        fail: function (err) {
          console.error('获取最新用户资料失败', err);
        }
      });
  },

  // 加载用户图片
  loadUserPhotos: function () {
    const that = this;
    this.setData({
      loading: true,
      error: ''
    });

    const db = wx.cloud.database();
    db.collection('lab6_photos')
      .where({
        _openid: this.data.openid
      })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get({
        success: function (res) {
          console.log('查询用户图片成功', res);
          const photos = res.data.map(function (item) {
            return {
              _id: item._id,
              photoUrl: item.photoUrl,
              title: item.title || '图片分享',
              category: item.category || '其他',
              createTime: item.createTime,
              addDate: item.addDate || ''
            };
          });
          
          // 从第一张图片中获取用户信息（如果还没有的话）
          if (photos.length > 0 && res.data[0]) {
            const first = res.data[0];
            that.setData({
              nickName: that.data.nickName || first.nickName || '匿名喵友',
              avatarUrl: that.data.avatarUrl || first.avatarUrl || '',
              country: first.country || '',
              province: first.province || '',
              city: first.city || ''
            });
          }

          // 计算分类数
          const categories = {};
          photos.forEach(function (item) {
            if (item.category) {
              categories[item.category] = true;
            }
          });
          const categoryCount = Object.keys(categories).length;

          that.setData({
            photoList: photos,
            photoCount: photos.length,
            categoryCount: categoryCount,
            loading: false
          });

          // 加载获赞数
          that.loadUserLikes(photos);
        },
        fail: function (err) {
          console.error('查询用户图片失败', err);
          that.setData({
            loading: false,
            error: '加载失败，请重试'
          });
        }
      });
  },

  // 加载用户获赞数
  loadUserLikes: function (photos) {
    const that = this;
    if (!photos || photos.length === 0) {
      this.setData({ likeCount: 0 });
      return;
    }

    const db = wx.cloud.database();
    const photoIds = photos.map(function (item) {
      return item._id;
    });

    // 查询这些图片获得的所有点赞
    db.collection('lab6_likes')
      .where({
        photoId: db.command.in(photoIds)
      })
      .count({
        success: function (res) {
          console.log('查询用户获赞数成功', res);
          that.setData({ likeCount: res.total || 0 });
        },
        fail: function (err) {
          console.error('查询用户获赞数失败', err);
          that.setData({ likeCount: 0 });
        }
      });
  },

  // 打开编辑资料弹窗
  openEditModal: function () {
    if (!this.data.isOwner) return;
    this.setData({
      showEditModal: true,
      editAvatar: this.data.avatarUrl || '',
      editNickName: this.data.nickName || ''
    });
  },

  // 关闭编辑资料弹窗
  closeEditModal: function () {
    if (this.data.saving || this.data.avatarUploading) return;
    this.setData({ showEditModal: false });
  },

  // 选择头像
  onChooseAvatar: function (e) {
    const that = this;
    const tempAvatarPath = e.detail.avatarUrl;
    if (!tempAvatarPath) return;

    this.setData({ 
      editAvatar: tempAvatarPath,
      avatarUploading: true 
    });

    // 上传头像到云存储
    const openid = app.globalData.openid || 'unknown';
    const timestamp = Date.now();
    const ext = tempAvatarPath.split('.').pop() || 'jpg';
    const cloudPath = 'lab6/avatars/' + openid + '-' + timestamp + '.' + ext;

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempAvatarPath,
      success: function (res) {
        console.log('头像上传成功', res);
        that.setData({
          editAvatar: res.fileID,
          avatarUploading: false
        });
      },
      fail: function (err) {
        console.error('头像上传失败', err);
        that.setData({ avatarUploading: false });
        wx.showToast({ title: '头像上传失败，请重试', icon: 'none' });
      }
    });
  },

  // 昵称输入
  onNickNameInput: function (e) {
    this.setData({ editNickName: e.detail.value });
  },

  // 保存资料
  saveProfile: function () {
    const that = this;
    const nickName = (this.data.editNickName || '').trim();

    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (nickName.length > 20) {
      wx.showToast({ title: '昵称最多20字', icon: 'none' });
      return;
    }
    if (this.data.saving || this.data.avatarUploading) {
      return;
    }

    this.setData({ saving: true });

    const profileData = {
      avatarUrl: this.data.editAvatar || '',
      nickName: nickName
    };

    app.saveUserProfile(profileData, function (result) {
      that.setData({ saving: false });
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        that.setData({
          showEditModal: false,
          avatarUrl: profileData.avatarUrl,
          nickName: profileData.nickName
        });
      } else {
        wx.showToast({ title: '保存失败，请稍后再试', icon: 'none' });
      }
    });
  },

  // 点击图片进入详情
  onPhotoTap: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: '/pages/detail/detail?id=' + id
      });
    }
  },

  // 返回首页
  goHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
