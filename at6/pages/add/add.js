// pages/add/add.js
const app = getApp()

Page({
  data: {
    selectedImage: '',
    uploading: false,
    uploadProgress: 0,
    myPhotos: [],
    loading: false,
    userInfo: null,
    openid: '',
    // 新增：发布信息
    title: '',
    description: '',
    category: '生活',
    categories: ['风景', '美食', '校园', '萌宠', '生活', '其他'],
    categoryIndex: 4,
    submitting: false
  },

  onLoad: function () {
    this.initUserInfo();
  },

  onShow: function () {
    this.loadMyPhotos();
  },

  // 初始化用户信息
  initUserInfo: function () {
    const that = this;
    
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }

    if (app.globalData.openid) {
      this.setData({
        openid: app.globalData.openid
      });
    } else {
      const checkOpenid = setInterval(() => {
        if (app.globalData.openid) {
          that.setData({
            openid: app.globalData.openid
          });
          clearInterval(checkOpenid);
        }
      }, 500);
      setTimeout(() => clearInterval(checkOpenid), 10000);
    }
  },

  // 标题输入
  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 简介输入
  onDescriptionInput: function (e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 分类选择
  onCategoryChange: function (e) {
    const index = e.detail.value;
    this.setData({
      categoryIndex: index,
      category: this.data.categories[index]
    });
  },

  // 选择图片
  chooseImage: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      camera: 'back',
      success(res) {
        console.log('选择图片成功', res);
        const tempFile = res.tempFiles[0];
        that.setData({
          selectedImage: tempFile.tempFilePath
        });
      },
      fail(err) {
        console.error('选择图片失败', err);
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 预览选中的图片
  previewSelected: function () {
    if (this.data.selectedImage) {
      wx.previewImage({
        urls: [this.data.selectedImage],
        current: this.data.selectedImage
      });
    }
  },

  // 清除选中的图片
  clearSelected: function () {
    this.setData({
      selectedImage: ''
    });
  },

  // 重置表单
  resetForm: function () {
    this.setData({
      title: '',
      description: '',
      category: '生活',
      categoryIndex: 4,
      selectedImage: ''
    });
  },

  // 上传图片
  uploadImage: function () {
    const that = this;
    
    // 防止重复提交
    if (this.data.submitting || this.data.uploading) {
      return;
    }

    if (!this.data.selectedImage) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    // 验证标题
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({
        title: '请输入图片标题',
        icon: 'none'
      });
      return;
    }
    if (title.length > 30) {
      wx.showToast({
        title: '标题最多30字',
        icon: 'none'
      });
      return;
    }

    // 验证简介
    const description = this.data.description.trim();
    if (description.length > 120) {
      wx.showToast({
        title: '简介最多120字',
        icon: 'none'
      });
      return;
    }

    // 检查用户信息（优先使用lab6_users中的最新资料）
    let userInfo = {};
    
    // 优先从app.getCurrentUserDisplay()获取（包含lab6_users最新资料）
    const displayInfo = app.getCurrentUserDisplay ? app.getCurrentUserDisplay() : null;
    if (displayInfo) {
      userInfo.avatarUrl = displayInfo.avatarUrl;
      userInfo.nickName = displayInfo.nickName;
    }
    
    // 补充地区信息（从userInfo或globalData获取）
    const rawUserInfo = this.data.userInfo || app.globalData.userInfo || {};
    userInfo.country = rawUserInfo.country || '';
    userInfo.province = rawUserInfo.province || '';
    userInfo.city = rawUserInfo.city || '';
    
    // 确保有默认值
    if (!userInfo.nickName) userInfo.nickName = '匿名喵友';
    if (!userInfo.avatarUrl) userInfo.avatarUrl = '';

    this.setData({
      uploading: true,
      uploadProgress: 0,
      submitting: true
    });

    // 生成文件名：时间戳-随机数
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = this.data.selectedImage.split('.').pop() || 'jpg';
    const cloudPath = `lab6/photos/${timestamp}-${random}.${ext}`;

    console.log('上传到云存储路径:', cloudPath);

    // 上传到云存储
    const uploadTask = wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: this.data.selectedImage,
      success: res => {
        console.log('上传成功', res);
        const fileID = res.fileID;
        
        // 保存到数据库
        that.saveToDatabase(fileID, userInfo, title, description);
      },
      fail: err => {
        console.error('上传失败', err);
        that.setData({
          uploading: false,
          submitting: false
        });
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        });
      }
    });

    // 监听上传进度
    uploadTask.onProgressUpdate((res) => {
      that.setData({
        uploadProgress: res.progress
      });
    });
  },

  // 保存到数据库
  saveToDatabase: function (fileID, userInfo, title, description) {
    const that = this;
    const db = wx.cloud.database();
    
    const now = new Date();
    const addDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    db.collection('lab6_photos').add({
      data: {
        photoUrl: fileID,
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '微信用户',
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        addDate: addDate,
        createTime: db.serverDate(),
        // 新增字段
        title: title || '图片分享',
        description: description || '',
        category: this.data.category || '其他'
      },
      success: res => {
        console.log('保存数据库成功', res);
        that.setData({
          uploading: false,
          uploadProgress: 0,
          submitting: false
        });
        
        // 重置表单
        that.resetForm();
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });

        // 刷新上传历史
        that.loadMyPhotos();
      },
      fail: err => {
        console.error('保存数据库失败', err);
        that.setData({
          uploading: false,
          submitting: false
        });
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 加载我的上传历史
  loadMyPhotos: function () {
    const that = this;
    const openid = this.data.openid || app.globalData.openid;
    
    if (!openid) {
      console.log('openid尚未获取，跳过加载历史');
      return;
    }

    this.setData({
      loading: true
    });

    const db = wx.cloud.database();
    db.collection('lab6_photos')
      .where({
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get({
        success: res => {
          console.log('查询我的图片成功', res);
          that.setData({
            myPhotos: res.data,
            loading: false
          });
        },
        fail: err => {
          console.error('查询我的图片失败', err);
          that.setData({
            loading: false
          });
        }
      });
  },

  // 点击历史图片，进入详情
  onHistoryPhotoTap: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    }
  }
});
